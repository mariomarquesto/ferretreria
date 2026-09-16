import { pool } from '../config/db.js';

export class BaseModel {
  static tableName = '';
  static primaryKey = 'id';
  static fillable = [];
  static searchable = [];

  static async findAll({ where = {}, order = 'id DESC', limit, offset, search } = {}) {
    const conditions = [];
    const params = [];

    for (const [key, value] of Object.entries(where)) {
      if (value === undefined || value === null) continue;
      params.push(value);
      conditions.push(`${key} = $${params.length}`);
    }

    if (search && this.searchable.length > 0) {
      params.push(`%${search}%`);
      const ors = this.searchable.map(col => `${col} ILIKE $${params.length}`);
      conditions.push(`(${ors.join(' OR ')})`);
    }

    let sql = `SELECT * FROM ${this.tableName}`;
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ` ORDER BY ${order}`;
    if (limit) { params.push(limit); sql += ` LIMIT $${params.length}`; }
    if (offset) { params.push(offset); sql += ` OFFSET $${params.length}`; }

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`, [id]
    );
    return rows[0] || null;
  }

  static async findOne(where = {}) {
    const [row] = await this.findAll({ where, limit: 1 });
    return row || null;
  }

  static async create(data) {
    const fields = Object.keys(data).filter(k => this.fillable.includes(k));
    if (fields.length === 0) throw new Error('No hay campos válidos');

    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map(f => data[f]);

    const sql = `INSERT INTO ${this.tableName} (${fields.join(',')})
                 VALUES (${placeholders.join(',')}) RETURNING *`;
    const { rows } = await pool.query(sql, values);
    return rows[0];
  }

  static async update(id, data) {
    const fields = Object.keys(data).filter(k => this.fillable.includes(k));
    if (fields.length === 0) throw new Error('No hay campos para actualizar');

    const sets = fields.map((f, i) => `${f} = $${i + 1}`);
    const values = [...fields.map(f => data[f]), id];

    const sql = `UPDATE ${this.tableName} SET ${sets.join(', ')}
                 WHERE ${this.primaryKey} = $${values.length} RETURNING *`;
    const { rows } = await pool.query(sql, values);
    return rows[0] || null;
  }

  static async delete(id) {
    const { rowCount } = await pool.query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`, [id]
    );
    return rowCount > 0;
  }

  static async softDelete(id) {
    const { rows } = await pool.query(
      `UPDATE ${this.tableName} SET activo = FALSE WHERE ${this.primaryKey} = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  }
}