import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.join(__dirname, 'seeds');

async function runSeeds() {
  console.log('🌱 Ejecutando seeders...\n');
  const files = (await fs.readdir(SEEDS_DIR)).sort();

  for (const file of files) {
    console.log(`▶️  ${file}`);
    try {
      if (file.endsWith('.sql')) {
        const sql = await fs.readFile(path.join(SEEDS_DIR, file), 'utf-8');
        await pool.query(sql);
      } else if (file.endsWith('.js')) {
        const mod = await import(`file://${path.join(SEEDS_DIR, file)}`);
        await mod.seed();
      }
      console.log(`✅ ${file}\n`);
    } catch (e) {
      console.error(`❌ Error en ${file}:`, e.message);
      throw e;
    }
  }
  console.log('🎉 Seeders completados');
}

runSeeds()
  .catch(err => { console.error('💥 Error:', err); process.exit(1); })
  .finally(() => pool.end());