import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  ...config.db,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en PostgreSQL:', err);
});

// Query simple
export const query = (text, params) => pool.query(text, params);

// Transacción con callback
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Test de conexión
export const testConnection = async () => {
  try {
    const { rows } = await pool.query('SELECT NOW() as now, version() as version');
    console.log('✅ PostgreSQL conectado');
    console.log('   Versión:', rows[0].version.split(' ').slice(0, 2).join(' '));
    console.log('   Hora:', rows[0].now.toISOString());
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    process.exit(1);
  }
};