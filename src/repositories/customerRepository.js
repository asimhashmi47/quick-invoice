const db = require('../database/db');

function create({ name, phone = null, email = null, address = null }) {
  const stmt = db.prepare(`INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)`);
  const result = stmt.run(name, phone, email, address);
  return findById(result.lastInsertRowid);
}

function findAll({ search = '' } = {}) {
  if (search) {
    const stmt = db.prepare(
      `SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY created_at DESC, id DESC`
    );
    const term = `%${search}%`;
    return stmt.all(term, term, term);
  }
  return db.prepare(`SELECT * FROM customers ORDER BY created_at DESC, id DESC`).all();
}

function findById(id) {
  return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
}

function update(id, fields) {
  const existing = findById(id);
  if (!existing) return null;

  const merged = { ...existing, ...fields };
  const stmt = db.prepare(
    `UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, updated_at = datetime('now') WHERE id = ?`
  );
  stmt.run(merged.name, merged.phone, merged.email, merged.address, id);
  return findById(id);
}

function remove(id) {
  const result = db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
  return result.changes > 0;
}

function countAll() {
  return db.prepare(`SELECT COUNT(*) AS count FROM customers`).get().count;
}

function hasInvoices(id) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM invoices WHERE customer_id = ?`).get(id);
  return row.count > 0;
}

module.exports = { create, findAll, findById, update, remove, countAll, hasInvoices };
