import { transaction } from '../config/db.js';

export class ComprasService {
  /**
   * Registrar una compra completa:
   *  - Calcula subtotal, IVA y total desde BD
   *  - Inserta la cabecera en `compras`
   *  - Inserta el detalle en `detalle_compra` (el trigger suma stock)
   *  - Registra en movimientos_stock automáticamente vía trigger
   *
   * @param {Object} data - { proveedor_id, items, forma_pago, observaciones, estado }
   * @param {Number} usuario_id - ID del usuario que registra
   * @returns {Object} La compra creada con `numero`, `total`, etc.
   */
  static async registrar(data, usuario_id = null) {
    const { proveedor_id, items, forma_pago, observaciones, estado = 'recibida' } = data;

    if (!items || items.length === 0) {
      throw new Error('La compra no tiene items');
    }

    if (!proveedor_id) {
      throw new Error('La compra requiere un proveedor');
    }

    return transaction(async (client) => {
      let subtotal = 0;
      let iva = 0;
      const itemsProc = [];

      // 1) Validar cada producto y calcular totales desde BD
      for (const it of items) {
        if (!it.producto_id) throw new Error('Item sin producto_id');
        if (!it.cantidad || it.cantidad <= 0) throw new Error('Cantidad inválida');
        if (!it.precio_unitario || it.precio_unitario < 0) {
          throw new Error('Precio unitario inválido');
        }

        const { rows: [prod] } = await client.query(
          'SELECT id, iva, nombre FROM productos WHERE id = $1',
          [it.producto_id]
        );

        if (!prod) throw new Error(`Producto ${it.producto_id} no existe`);

        const sub = Number(it.precio_unitario) * it.cantidad;
        const ivaItem = sub * (Number(prod.iva) / 100);

        subtotal += sub;
        iva += ivaItem;

        itemsProc.push({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          subtotal: sub
        });
      }

      const total = subtotal + iva;

      // 2) Insertar cabecera
      const { rows: [compra] } = await client.query(`
        INSERT INTO compras
          (numero, proveedor_id, usuario_id, subtotal, iva, total, estado, forma_pago, observaciones)
        VALUES
          ('C-' || LPAD(nextval('compras_id_seq')::text, 8, '0'),
           $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [proveedor_id, usuario_id, subtotal, iva, total, estado, forma_pago, observaciones]);

      // 3) Insertar detalle (el trigger suma stock y registra kardex)
      for (const it of itemsProc) {
        await client.query(`
          INSERT INTO detalle_compra
            (compra_id, producto_id, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5)
        `, [compra.id, it.producto_id, it.cantidad, it.precio_unitario, it.subtotal]);
      }

      return compra;
    });
  }

  /**
   * Anular una compra:
   *  - Cambia estado a 'anulada'
   *  - Resta del stock los items que habían entrado
   *  - Registra movimientos de reversión
   */
  static async anular(compra_id, usuario_id = null) {
    return transaction(async (client) => {
      const { rows: [compra] } = await client.query(
        'SELECT * FROM compras WHERE id = $1 FOR UPDATE',
        [compra_id]
      );

      if (!compra) throw new Error('Compra no existe');
      if (compra.estado === 'anulada') throw new Error('La compra ya está anulada');

      const { rows: items } = await client.query(
        'SELECT * FROM detalle_compra WHERE compra_id = $1',
        [compra_id]
      );

      for (const it of items) {
        const { rows: [p] } = await client.query(
          'SELECT stock, nombre FROM productos WHERE id = $1 FOR UPDATE',
          [it.producto_id]
        );

        const stockNvo = p.stock - it.cantidad;

        if (stockNvo < 0) {
          throw new Error(
            `No se puede anular: el stock actual de "${p.nombre}" (${p.stock}) es menor a lo que había entrado (${it.cantidad})`
          );
        }

        await client.query(
          'UPDATE productos SET stock = $1 WHERE id = $2',
          [stockNvo, it.producto_id]
        );

        await client.query(`
          INSERT INTO movimientos_stock
            (producto_id, tipo, motivo, referencia_id, referencia_tipo,
             cantidad, stock_anterior, stock_posterior, costo_unitario, usuario_id)
          VALUES ($1, 'ajuste', 'anulacion compra', $2, 'compra',
                  $3, $4, $5, $6, $7)
        `, [it.producto_id, compra_id, -it.cantidad, p.stock, stockNvo, it.precio_unitario, usuario_id]);
      }

      const { rows: [actualizada] } = await client.query(
        "UPDATE compras SET estado = 'anulada' WHERE id = $1 RETURNING *",
        [compra_id]
      );

      return actualizada;
    });
  }

  /**
   * Marcar compra como pagada.
   */
  static async marcarPagada(compra_id) {
    return transaction(async (client) => {
      const { rows: [compra] } = await client.query(
        'SELECT * FROM compras WHERE id = $1 FOR UPDATE',
        [compra_id]
      );

      if (!compra) throw new Error('Compra no existe');
      if (compra.estado === 'anulada') throw new Error('No se puede pagar una compra anulada');

      const { rows: [actualizada] } = await client.query(
        "UPDATE compras SET estado = 'pagada' WHERE id = $1 RETURNING *",
        [compra_id]
      );

      return actualizada;
    });
  }
}