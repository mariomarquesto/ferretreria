import { pool, transaction } from '../config/db.js';

export class VentasService {
  /**
   * Registrar una venta completa.
   * - Calcula totales desde BD (nunca confía en el front)
   * - Verifica stock por producto (soporta decimales si el producto lo permite)
   * - Guarda detalle con unidad_medida y presentación
   * - El trigger descuenta stock automáticamente
   */
  static async registrar(data, usuario_id = null, caja_id = null) {
    const {
      cliente_id = null,
      items,
      forma_pago = 'efectivo',
      descuento = 0,
      canal = 'pos',
      observaciones = null
    } = data;

    if (!items || items.length === 0) {
      throw new Error('La venta no tiene items');
    }

    return transaction(async (client) => {
      let subtotal = 0;
      let iva = 0;
      let costoTotal = 0;
      const itemsProc = [];

      // 1) Validar cada item y calcular totales desde BD
      for (const item of items) {
        if (!item.producto_id) throw new Error('Item sin producto_id');
        if (!item.cantidad || item.cantidad <= 0) {
          throw new Error(`Cantidad inválida para producto ${item.producto_id}`);
        }

        // ⚠️ FIX: FOR UPDATE OF p (no bloquea el LEFT JOIN)
        const { rows: [prod] } = await client.query(
          `SELECT
              p.id, p.codigo, p.nombre,
              p.precio_compra, p.precio_venta, p.iva, p.stock,
              p.permite_decimales, p.presentacion, p.unidades_por_presentacion,
              u.codigo AS unidad
           FROM productos p
           LEFT JOIN unidades_medida u ON u.id = p.unidad_id
           WHERE p.id = $1 AND p.activo = TRUE
           FOR UPDATE OF p`,
          [item.producto_id]
        );

        if (!prod) {
          throw new Error(`Producto ${item.producto_id} no existe o está inactivo`);
        }

        // Si NO permite decimales, redondear cantidad
        const cantidad = prod.permite_decimales
          ? Number(item.cantidad)
          : Math.round(Number(item.cantidad));

        if (Number(prod.stock) < cantidad) {
          const unidad = prod.unidad || 'UN';
          throw new Error(
            `Stock insuficiente de "${prod.nombre}". Disponible: ${prod.stock} ${unidad}, solicitado: ${cantidad} ${unidad}`
          );
        }

        const sub = Number(prod.precio_venta) * cantidad;
        const ivaItem = sub * (Number(prod.iva) / 100);

        subtotal += sub;
        iva += ivaItem;
        costoTotal += Number(prod.precio_compra) * cantidad;

        itemsProc.push({
          producto_id: prod.id,
          cantidad,
          precio_unitario: prod.precio_venta,
          costo_unitario: prod.precio_compra,
          subtotal: sub,
          descuento: 0,
          unidad_medida: prod.unidad || 'UN',
          presentacion: prod.presentacion
        });
      }

      const total = subtotal + iva - Number(descuento);

      if (total < 0) {
        throw new Error('El descuento no puede superar el total');
      }

      // 2) Insertar cabecera
      const { rows: [venta] } = await client.query(`
        INSERT INTO ventas
          (numero, cliente_id, usuario_id, caja_id, subtotal, descuento, iva,
           total, costo_total, forma_pago, canal, observaciones, estado)
        VALUES
          ('V-' || LPAD(nextval('ventas_id_seq')::text, 8, '0'),
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completada')
        RETURNING *
      `, [cliente_id, usuario_id, caja_id, subtotal, descuento, iva,
          total, costoTotal, forma_pago, canal, observaciones]);

      // 3) Insertar detalle (trigger descuenta stock + registra kardex)
      for (const it of itemsProc) {
        await client.query(`
          INSERT INTO detalle_venta
            (venta_id, producto_id, cantidad, precio_unitario, costo_unitario,
             descuento, subtotal, unidad_medida, presentacion)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          venta.id,
          it.producto_id,
          it.cantidad,
          it.precio_unitario,
          it.costo_unitario,
          it.descuento,
          it.subtotal,
          it.unidad_medida,
          it.presentacion
        ]);
      }

      // 4) Generar alertas de stock bajo
      await client.query(`
        INSERT INTO alertas (tipo, producto_id, mensaje)
        SELECT 'stock_bajo', id, 'Stock crítico: ' || nombre || ' (' || stock || ')'
        FROM productos
        WHERE stock <= stock_minimo AND activo = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM alertas a
            WHERE a.producto_id = productos.id
              AND a.tipo = 'stock_bajo'
              AND a.leida = FALSE
          )
      `);

      // 5) Actualizar saldo del cliente si es cuenta corriente
      if (cliente_id && forma_pago === 'cta_cte') {
        await client.query(
          'UPDATE clientes SET saldo = saldo + $1 WHERE id = $2',
          [total, cliente_id]
        );
      }

      return venta;
    });
  }

  /**
   * Anular una venta: devuelve stock, cambia estado, registra devolución en kardex.
   */
  static async anular(venta_id, usuario_id = null, motivo = 'anulación manual') {
    return transaction(async (client) => {
      const { rows: [venta] } = await client.query(
        'SELECT * FROM ventas WHERE id = $1 FOR UPDATE',
        [venta_id]
      );

      if (!venta) throw new Error('Venta no existe');
      if (venta.estado === 'anulada') throw new Error('La venta ya está anulada');

      const { rows: items } = await client.query(
        'SELECT * FROM detalle_venta WHERE venta_id = $1',
        [venta_id]
      );

      for (const it of items) {
        const { rows: [p] } = await client.query(
          'SELECT stock, nombre FROM productos WHERE id = $1 FOR UPDATE',
          [it.producto_id]
        );

        const stockNvo = Number(p.stock) + Number(it.cantidad);

        await client.query(
          'UPDATE productos SET stock = $1 WHERE id = $2',
          [stockNvo, it.producto_id]
        );

        await client.query(`
          INSERT INTO movimientos_stock
            (producto_id, tipo, motivo, referencia_id, referencia_tipo,
             cantidad, stock_anterior, stock_posterior, costo_unitario, usuario_id)
          VALUES ($1, 'devolucion', $2, $3, 'venta',
                  $4, $5, $6, $7, $8)
        `, [it.producto_id, motivo, venta_id, it.cantidad,
            p.stock, stockNvo, it.costo_unitario, usuario_id]);
      }

      const { rows: [actualizada] } = await client.query(
        "UPDATE ventas SET estado = 'anulada' WHERE id = $1 RETURNING *",
        [venta_id]
      );

      if (venta.cliente_id && venta.forma_pago === 'cta_cte') {
        await client.query(
          'UPDATE clientes SET saldo = saldo - $1 WHERE id = $2',
          [venta.total, venta.cliente_id]
        );
      }

      return actualizada;
    });
  }
}