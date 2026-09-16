import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const reset = process.argv.includes('--reset');

async function runMigrations() {
  const client = await pool.connect();
  try {
    if (reset) {
      console.log('⚠️  RESET: borrando schema public...');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      console.log('✅ Schema reseteado\n');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const { rows: ejecutadas } = await client.query('SELECT filename FROM _migrations');
    const set = new Set(ejecutadas.map(r => r.filename));

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (set.has(file)) {
        console.log(`⏭️  ${file} (ya ejecutada)`);
        continue;
      }
      console.log(`▶️  Ejecutando ${file}...`);
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations(filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ ${file}\n`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`❌ Error en ${file}:`, e.message);
        throw e;
      }
    }
    console.log('🎉 Migraciones completadas');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});