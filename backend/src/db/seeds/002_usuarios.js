import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';

export async function seed() {
  const hash = await bcrypt.hash('admin123', 10);

  const { rows: [rolAdmin] } = await pool.query(
    "SELECT id FROM roles WHERE nombre = 'admin'"
  );

  await pool.query(`
    INSERT INTO usuarios (nombre, email, password_hash, rol_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, ['Administrador', 'admin@ferreteria.com', hash, rolAdmin.id]);

  console.log('   👤 admin@ferreteria.com / admin123');
}