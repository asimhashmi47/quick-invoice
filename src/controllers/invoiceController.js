const invoiceService = require('../services/invoiceService');
const pdfService = require('../services/pdfService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const invoices = invoiceService.listInvoices(req.query.search);
  res.json({ success: true, data: invoices });
});

const getOne = asyncHandler(async (req, res) => {
  const invoice = invoiceService.getInvoice(Number(req.params.id));
  res.json({ success: true, data: invoice });
});

const create = asyncHandler(async (req, res) => {
  const invoice = invoiceService.createInvoice(req.body);
  res.status(201).json({ success: true, data: invoice });
});

const updateStatus = asyncHandler(async (req, res) => {
  const invoice = invoiceService.updateInvoiceStatus(Number(req.params.id), req.body && req.body.status);
  res.json({ success: true, data: invoice });
});

const remove = asyncHandler(async (req, res) => {
  invoiceService.deleteInvoice(Number(req.params.id));
  res.status(204).send();
});

const downloadPdf = asyncHandler(async (req, res) => {
  const invoice = invoiceService.getInvoice(Number(req.params.id));
  const safeName = invoice.invoice_number.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
  pdfService.generateInvoicePdf(invoice, res);
});

const dashboard = asyncHandler(async (req, res) => {
  const summary = invoiceService.getDashboardSummary();
  res.json({ success: true, data: summary });
});

module.exports = { list, getOne, create, updateStatus, remove, downloadPdf, dashboard };
