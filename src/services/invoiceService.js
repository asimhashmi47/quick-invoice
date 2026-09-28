const invoiceRepository = require('../repositories/invoiceRepository');
const customerRepository = require('../repositories/customerRepository');
const ApiError = require('../utils/ApiError');
const { validateInvoiceInput } = require('../utils/validators');

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const INVOICE_STATUSES = ['draft', 'paid'];

function formatInvoiceNumber(sequence) {
  return `INV-${String(sequence).padStart(5, '0')}`;
}

function generateInvoiceNumber() {
  let sequence = invoiceRepository.nextInvoiceSequence();
  while (invoiceRepository.numberExists(formatInvoiceNumber(sequence))) {
    sequence += 1;
  }
  return formatInvoiceNumber(sequence);
}

function listInvoices(search) {
  return invoiceRepository.findAll({ search });
}

function getInvoice(id) {
  const invoice = invoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found.');
  return invoice;
}

function createInvoice(body) {
  const data = validateInvoiceInput(body);

  const customer = customerRepository.findById(data.customerId);
  if (!customer) {
    throw ApiError.badRequest('Validation failed.', { customerId: 'Selected customer does not exist.' });
  }

  const items = data.items.map((item) => ({
    ...item,
    lineTotal: round2(item.quantity * item.unitPrice),
  }));
  const subtotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const total = subtotal;

  if (data.invoiceNumber && invoiceRepository.numberExists(data.invoiceNumber)) {
    throw ApiError.conflict('An invoice with this number already exists.');
  }
  const invoiceNumber = data.invoiceNumber || generateInvoiceNumber();

  return invoiceRepository.create({
    invoiceNumber,
    customerId: data.customerId,
    invoiceDate: data.invoiceDate,
    subtotal,
    total,
    status: data.status,
    items,
  });
}

function updateInvoiceStatus(id, status) {
  if (!INVOICE_STATUSES.includes(status)) {
    throw ApiError.badRequest('Validation failed.', { status: 'Status must be "draft" or "paid".' });
  }
  getInvoice(id);
  invoiceRepository.updateStatus(id, status);
  return getInvoice(id);
}

function deleteInvoice(id) {
  getInvoice(id);
  invoiceRepository.remove(id);
}

function getDashboardSummary() {
  return {
    totalInvoices: invoiceRepository.countAll(),
    totalCustomers: customerRepository.countAll(),
    totalSales: invoiceRepository.sumTotals(),
    recentInvoices: invoiceRepository.findRecent(5),
  };
}

module.exports = {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getDashboardSummary,
};
