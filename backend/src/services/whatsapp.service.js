import axios from 'axios';
import { pool } from '../config/db.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'ferreteria';
const PAIS_CODIGO = process.env.WHATSAPP_PAIS || '54'; // Argentina por defecto

// ============================================================
// SERVICIO DE WHATSAPP
// ============================================================
export class WhatsAppService {
  /**
   * Normaliza un teléfono argentino para WhatsApp
   * Ej: "11-5555-1234" → "541155551234"
   */
  static normalizarTelefono(telefono) {
    if (!telefono) return null;

    // Limpiar todo lo que no sea número
    let limpio = String(telefono).replace(/\D/g, '');

    // Si ya empieza con 54, lo dejamos
    if (limpio.startsWith(PAIS_CODIGO)) {
      return limpio;
    }

    // Si empieza con 0, lo sacamos (ej: 011 → 11)
    if (limpio.startsWith('0')) {
      limpio = limpio.slice(1);
    }

    // Si empieza con 15, lo sacamos (es el prefijo de celular local)
    // Ej: 11 15 5555-1234 → 11 5555-1234
    // Esto es complejo porque depende de la zona, pero hacemos un intento
    limpio = limpio.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');

    return `${PAIS_CODIGO}${limpio}`;
  }

  /**
   * Verifica si la instancia de Evolution API está conectada
   */
  static async verificarConexion() {
    try {
      const { data } = await axios.get(
        `${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`,
        {
          headers: { apikey: EVOLUTION_API_KEY },
          timeout: 5000
        }
      );

      return {
        ok: true,
        estado: data.instance?.state || 'unknown',
        conectado: data.instance?.state === 'open'
      };
    } catch (err) {
      return {
        ok: false,
        estado: 'error',
        conectado: false,
        error: err.response?.data?.message || err.message
      };
    }
  }

  /**
   * Envía un mensaje de texto
   */
  static async enviarMensaje(telefono, mensaje, opciones = {}) {
    const numero = this.normalizarTelefono(telefono);

    if (!numero) {
      return { ok: false, error: 'Teléfono inválido' };
    }

    if (!mensaje || mensaje.trim().length === 0) {
      return { ok: false, error: 'Mensaje vacío' };
    }

    try {
      const { data } = await axios.post(
        `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
        {
          number: numero,
          text: mensaje,
          options: {
            delay: 1000,        // Delay de 1 seg (simula tipeo)
            presence: 'composing'
          }
        },
        {
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        ok: true,
        messageId: data.key?.id,
        numero,
        timestamp: data.messageTimestamp
      };
    } catch (err) {
      console.error('❌ Error enviando WhatsApp:', err.response?.data || err.message);
      return {
        ok: false,
        error: err.response?.data?.message || err.message
      };
    }
  }

  /**
   * Envía una imagen con caption
   */
  static async enviarImagen(telefono, imagenUrl, caption = '') {
    const numero = this.normalizarTelefono(telefono);

    if (!numero) {
      return { ok: false, error: 'Teléfono inválido' };
    }

    try {
      const { data } = await axios.post(
        `${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE_NAME}`,
        {
          number: numero,
          mediatype: 'image',
          media: imagenUrl,
          caption,
          options: {
            delay: 1500,
            presence: 'composing'
          }
        },
        {
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      return { ok: true, messageId: data.key?.id, numero };
    } catch (err) {
      console.error('❌ Error enviando imagen:', err.response?.data || err.message);
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  }

  /**
   * Envía un documento (PDF, etc.)
   */
  static async enviarDocumento(telefono, docUrl, nombreArchivo, caption = '') {
    const numero = this.normalizarTelefono(telefono);

    if (!numero) return { ok: false, error: 'Teléfono inválido' };

    try {
      const { data } = await axios.post(
        `${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE_NAME}`,
        {
          number: numero,
          mediatype: 'document',
          media: docUrl,
          fileName: nombreArchivo,
          caption
        },
        {
          headers: { apikey: EVOLUTION_API_KEY },
          timeout: 20000
        }
      );

      return { ok: true, messageId: data.key?.id, numero };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Envía mensaje desde una plantilla con variables reemplazadas
   */
  static async enviarDesdePlantilla(telefono, plantillaId, variables = {}) {
    try {
      // 1. Traer la plantilla
      const { rows: [plantilla] } = await pool.query(
        'SELECT * FROM plantillas_mensajes WHERE id = $1 AND activo = TRUE',
        [plantillaId]
      );

      if (!plantilla) {
        return { ok: false, error: 'Plantilla no encontrada' };
      }

      // 2. Reemplazar variables {{nombre}}, {{producto}}, etc.
      let mensaje = plantilla.contenido;
      Object.entries(variables).forEach(([key, value]) => {
        mensaje = mensaje.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      // 3. Enviar
      return await this.enviarMensaje(telefono, mensaje);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Envía mensajes masivos a una lista de clientes
   * Con delay entre mensajes para no ser bloqueado
   */
  static async enviarMasivo(clientes, mensaje, opciones = {}) {
    const {
      delayEntreMensajes = 5000, // 5 segundos entre mensajes
      onProgreso = null
    } = opciones;

    const resultados = {
      total: clientes.length,
      exitosos: 0,
      fallidos: 0,
      detalles: []
    };

    for (let i = 0; i < clientes.length; i++) {
      const cliente = clientes[i];
      const mensajePersonalizado = mensaje.replace(
        /{{nombre}}/g,
        cliente.nombre || 'cliente'
      );

      const resultado = await this.enviarMensaje(
        cliente.telefono,
        mensajePersonalizado
      );

      if (resultado.ok) {
        resultados.exitosos++;

        // Registrar en el historial
        await pool.query(`
          INSERT INTO cliente_comunicaciones
            (cliente_id, canal, direccion, tipo, mensaje, estado, message_id)
          VALUES ($1, 'whatsapp', 'enviado', 'texto', $2, 'enviado', $3)
        `, [cliente.id, mensajePersonalizado, resultado.messageId]);
      } else {
        resultados.fallidos++;
        resultados.detalles.push({
          cliente: cliente.nombre,
          telefono: cliente.telefono,
          error: resultado.error
        });
      }

      if (onProgreso) {
        onProgreso(i + 1, clientes.length);
      }

      // Delay para evitar bloqueos
      if (i < clientes.length - 1) {
        await new Promise((r) => setTimeout(r, delayEntreMensajes));
      }
    }

    return resultados;
  }

  /**
   * Guarda una comunicación entrante (recibida)
   */
  static async guardarMensajeRecibido({ telefono, mensaje, messageId, mediaUrl = null }) {
    const numero = this.normalizarTelefono(telefono);
    if (!numero) return null;

    // Buscar cliente por teléfono (últimos 8 dígitos para tolerancia)
    const ultimos8 = numero.slice(-8);
    const { rows: [cliente] } = await pool.query(`
      SELECT id, nombre FROM clientes
      WHERE telefono LIKE $1
      LIMIT 1
    `, [`%${ultimos8}%`]);

    if (!cliente) {
      console.log(`⚠️ Mensaje de número desconocido: ${numero}`);
      return null;
    }

    const { rows: [com] } = await pool.query(`
      INSERT INTO cliente_comunicaciones
        (cliente_id, canal, direccion, tipo, mensaje, media_url, message_id, estado)
      VALUES ($1, 'whatsapp', 'recibido', $2, $3, $4, $5, 'recibido')
      RETURNING *
    `, [
      cliente.id,
      mediaUrl ? 'imagen' : 'texto',
      mensaje,
      mediaUrl,
      messageId
    ]);

    return com;
  }

  /**
   * Obtiene el historial de conversación con un cliente
   */
  static async getConversacion(clienteId, limit = 100) {
    const { rows } = await pool.query(`
      SELECT
        cc.*,
        u.nombre AS usuario_nombre
      FROM cliente_comunicaciones cc
      LEFT JOIN usuarios u ON u.id = cc.usuario_id
      WHERE cc.cliente_id = $1 AND cc.canal = 'whatsapp'
      ORDER BY cc.created_at DESC
      LIMIT $2
    `, [clienteId, limit]);

    return rows.reverse(); // De más viejo a más nuevo
  }

  /**
   * Obtiene la lista de conversaciones activas (agrupadas por cliente)
   */
  static async getConversaciones({ limit = 50, offset = 0 } = {}) {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        c.telefono,
        c.avatar_url,
        cc.mensaje AS ultimo_mensaje,
        cc.direccion AS ultimo_direccion,
        cc.created_at AS ultimo_mensaje_at
      FROM clientes c
      JOIN cliente_comunicaciones cc ON cc.cliente_id = c.id
      WHERE cc.canal = 'whatsapp'
      ORDER BY c.id, cc.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Ordenar por fecha del último mensaje
    return rows.sort((a, b) =>
      new Date(b.ultimo_mensaje_at) - new Date(a.ultimo_mensaje_at)
    );
  }

  /**
   * Crea una instancia nueva en Evolution API
   */
  static async crearInstancia() {
    try {
      const { data } = await axios.post(
        `${EVOLUTION_API_URL}/instance/create`,
        {
          instanceName: INSTANCE_NAME,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        },
        {
          headers: { apikey: EVOLUTION_API_KEY }
        }
      );

      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || err.message };
    }
  }

  /**
   * Obtiene el QR para conectar WhatsApp
   */
  static async getQR() {
    try {
      const { data } = await axios.get(
        `${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`,
        {
          headers: { apikey: EVOLUTION_API_KEY }
        }
      );

      return {
        ok: true,
        qr: data.qrcode?.base64 || data.base64 || null,
        pairingCode: data.pairingCode || null
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Cierra la sesión de WhatsApp
   */
  static async cerrarSesion() {
    try {
      await axios.delete(
        `${EVOLUTION_API_URL}/instance/logout/${INSTANCE_NAME}`,
        {
          headers: { apikey: EVOLUTION_API_KEY }
        }
      );

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}