const db = require('../database/db');

const insertInvoiceStmt = db.prepare(
  `INSERT INTO invoices (invoice_number, customer_id, invoice_date, subtotal, total, status)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertItemStmt = db.prepare(
  `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
   VALUES (?, ?, ?, ?, ?)`
);

function create({ invoiceNumber, customerId, invoiceDate, subtotal, total, status, items }) {
  const createTransaction = db.transaction(() => {
    const result = insertInvoiceStmt.run(invoiceNumber, customerId, invoiceDate, subtotal, total, status);
    const invoiceId = result.lastInsertRowid;
    for (const item of items) {
      insertItemStmt.run(invoiceId, item.description, item.quantity, item.unitPrice, item.lineTotal);
    }
    return invoiceId;
  });

  const invoiceId = createTransaction();
  return findById(invoiceId);
}

function findAll({ search = '' } = {}) {
  const baseQuery = `
    SELECT invoices.*, customers.name AS customer_name
    FROM invoices
    JOIN customers ON customers.id = invoices.customer_id
  `;
  if (search) {
    const term = `%${search}%`;
    return db
      .prepare(
        `${baseQuery} WHERE invoices.invoice_number LIKE ? OR customers.name LIKE ? ORDER BY invoices.created_at DESC, invoices.id DESC`
      )
      .all(term, term);
  }
  return db.prepare(`${baseQuery} ORDER BY invoices.created_at DESC, invoices.id DESC`).all();
}

function findById(id) {
  const invoice = db
    .prepare(
      `SELECT invoices.*, customers.name AS customer_name, customers.phone AS customer_phone,
              customers.email AS customer_email, customers.address AS customer_address
       FROM invoices
       JOIN customers ON customers.id = invoices.customer_id
       WHERE invoices.id = ?`
    )
    .get(id);

  if (!invoice) return null;

  invoice.items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC`).all(id);
  return invoice;
}

function remove(id) {
  const result = db.prepare(`DELETE FROM invoices WHERE id = ?`).run(id);
  return result.changes > 0;
}

function countAll() {
  return db.prepare(`SELECT COUNT(*) AS count FROM invoices`).get().count;
}

function sumTotals() {
  const row = db.prepare(`SELECT COALESCE(SUM(total), 0) AS total FROM invoices`).get();
  return row.total;
}

function findRecent(limit = 5) {
  return db
    .prepare(
      `SELECT invoices.*, customers.name AS customer_name
       FROM invoices
       JOIN customers ON customers.id = invoices.customer_id
       ORDER BY invoices.created_at DESC, invoices.id DESC
       LIMIT ?`
    )
    .all(limit);
}

function updateStatus(id, status) {
  const result = db
    .prepare(`UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, id);
  return result.changes > 0;
}

function numberExists(invoiceNumber) {
  return Boolean(db.prepare(`SELECT 1 FROM invoices WHERE invoice_number = ?`).get(invoiceNumber));
}

// AUTOINCREMENT ids are never reused, so this keeps generated numbers unique after deletions.
function nextInvoiceSequence() {
  const row = db.prepare(`SELECT seq FROM sqlite_sequence WHERE name = 'invoices'`).get();
  return (row ? row.seq : 0) + 1;
}

module.exports = {
  create,
  findAll,
  findById,
  remove,
  updateStatus,
  numberExists,
  countAll,
  sumTotals,
  findRecent,
  nextInvoiceSequence,
};
