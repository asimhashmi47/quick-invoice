const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#5B5CE2',
  text: '#171923',
  muted: '#667085',
  border: '#E6E8EF',
};

const PAGE_MARGIN = 50;
const LEFT = PAGE_MARGIN;
const RIGHT = 545;
const BILL_TO_X = 330;
const BILL_TO_WIDTH = RIGHT - BILL_TO_X;
const ROW_PADDING = 8;
const COLUMNS = {
  description: { x: LEFT, width: 245 },
  quantity: { x: 300, width: 55 },
  unitPrice: { x: 360, width: 90 },
  lineTotal: { x: 455, width: 90 },
};

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatQuantity(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// invoice_date is a calendar date (YYYY-MM-DD); format it in UTC so the server's timezone can't shift the day.
function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function pageBottom(doc) {
  return doc.page.height - PAGE_MARGIN;
}

function drawRule(doc, y) {
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.75).strokeColor(COLORS.border).stroke();
}

function drawHeader(doc, invoice) {
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(22).text('QuickInvoice', LEFT, PAGE_MARGIN);
  doc
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text(`Invoice #${invoice.invoice_number}`, LEFT, PAGE_MARGIN + 32, { width: BILL_TO_X - LEFT - 20 })
    .text(`Date: ${formatDate(invoice.invoice_date)}`);
  const leftBottom = doc.y;

  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text('Bill To', BILL_TO_X, PAGE_MARGIN, {
    width: BILL_TO_WIDTH,
  });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).text(invoice.customer_name, { width: BILL_TO_WIDTH });
  doc.fillColor(COLORS.muted);
  [invoice.customer_phone, invoice.customer_email, invoice.customer_address]
    .filter(Boolean)
    .forEach((line) => doc.text(line, { width: BILL_TO_WIDTH }));

  return Math.max(leftBottom, doc.y);
}

function drawTableHeader(doc, y) {
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10);
  doc.text('Description', COLUMNS.description.x, y, { width: COLUMNS.description.width });
  doc.text('Qty', COLUMNS.quantity.x, y, { width: COLUMNS.quantity.width, align: 'right' });
  doc.text('Price', COLUMNS.unitPrice.x, y, { width: COLUMNS.unitPrice.width, align: 'right' });
  doc.text('Total', COLUMNS.lineTotal.x, y, { width: COLUMNS.lineTotal.width, align: 'right' });
  const bottom = y + doc.currentLineHeight() + ROW_PADDING;
  drawRule(doc, bottom);
  return bottom + ROW_PADDING;
}

function drawItemRow(doc, item, y) {
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(10);
  doc.text(item.description, COLUMNS.description.x, y, { width: COLUMNS.description.width });
  doc.text(formatQuantity(item.quantity), COLUMNS.quantity.x, y, { width: COLUMNS.quantity.width, align: 'right' });
  doc.text(formatCurrency(item.unit_price), COLUMNS.unitPrice.x, y, {
    width: COLUMNS.unitPrice.width,
    align: 'right',
  });
  doc.text(formatCurrency(item.line_total), COLUMNS.lineTotal.x, y, {
    width: COLUMNS.lineTotal.width,
    align: 'right',
  });
}

function rowHeight(doc, item) {
  doc.font('Helvetica').fontSize(10);
  return doc.heightOfString(item.description, { width: COLUMNS.description.width }) + ROW_PADDING * 2;
}

function drawTotals(doc, invoice, y) {
  const labelX = COLUMNS.unitPrice.x - 40;
  const labelWidth = COLUMNS.unitPrice.width + 40;
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted);
  doc.text('Subtotal', labelX, y, { width: labelWidth, align: 'right' });
  doc.fillColor(COLORS.text).text(formatCurrency(invoice.subtotal), COLUMNS.lineTotal.x, y, {
    width: COLUMNS.lineTotal.width,
    align: 'right',
  });

  const totalY = y + 20;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary);
  doc.text('Total', labelX, totalY, { width: labelWidth, align: 'right' });
  doc.text(formatCurrency(invoice.total), COLUMNS.lineTotal.x - 30, totalY, {
    width: COLUMNS.lineTotal.width + 30,
    align: 'right',
  });
  return totalY + doc.currentLineHeight();
}

function generateInvoicePdf(invoice, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE_MARGIN,
    info: { Title: `Invoice ${invoice.invoice_number}` },
  });
  doc.pipe(res);

  let y = drawTableHeader(doc, drawHeader(doc, invoice) + 36);

  for (const item of invoice.items) {
    const height = rowHeight(doc, item);
    if (y + height > pageBottom(doc)) {
      doc.addPage();
      y = drawTableHeader(doc, PAGE_MARGIN);
    }
    drawItemRow(doc, item, y + ROW_PADDING / 2);
    y += height;
    drawRule(doc, y - ROW_PADDING / 2);
  }

  const totalsHeight = 60;
  if (y + totalsHeight > pageBottom(doc)) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  y = drawTotals(doc, invoice, y + 10);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text('Thank you for your business.', LEFT, Math.min(y + 48, pageBottom(doc) - 12), {
      width: RIGHT - LEFT,
      align: 'center',
    });

  doc.end();
}

module.exports = { generateInvoicePdf };
