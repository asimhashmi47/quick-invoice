const ApiError = require('./ApiError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 500;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateCustomerInput(body, { partial = false } = {}) {
  const errors = {};
  const data = {};

  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      errors.name = 'Name is required.';
    } else if (body.name.trim().length > MAX_TEXT_LENGTH) {
      errors.name = `Name must be at most ${MAX_TEXT_LENGTH} characters.`;
    } else {
      data.name = body.name.trim();
    }
  }

  if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
    if (typeof body.phone !== 'string' || body.phone.trim().length > 30) {
      errors.phone = 'Phone must be at most 30 characters.';
    } else {
      data.phone = body.phone.trim();
    }
  } else if (body.phone === '' || body.phone === null) {
    data.phone = null;
  }

  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (
      typeof body.email !== 'string' ||
      !EMAIL_REGEX.test(body.email.trim()) ||
      body.email.trim().length > MAX_TEXT_LENGTH
    ) {
      errors.email = 'Email must be a valid email address.';
    } else {
      data.email = body.email.trim();
    }
  } else if (body.email === '' || body.email === null) {
    data.email = null;
  }

  if (body.address !== undefined && body.address !== null && body.address !== '') {
    if (typeof body.address !== 'string' || body.address.trim().length > MAX_ADDRESS_LENGTH) {
      errors.address = `Address must be at most ${MAX_ADDRESS_LENGTH} characters.`;
    } else {
      data.address = body.address.trim();
    }
  } else if (body.address === '' || body.address === null) {
    data.address = null;
  }

  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('Validation failed.', errors);
  }

  return data;
}

function validateInvoiceInput(body) {
  const errors = {};

  if (!Number.isInteger(body.customerId) && !Number.isInteger(Number(body.customerId))) {
    errors.customerId = 'A valid customer is required.';
  }

  if (!isValidIsoDate(body.invoiceDate)) {
    errors.invoiceDate = 'A valid invoice date is required.';
  }

  if (body.invoiceNumber !== undefined && body.invoiceNumber !== null && body.invoiceNumber !== '') {
    if (typeof body.invoiceNumber !== 'string' || body.invoiceNumber.trim().length > 50) {
      errors.invoiceNumber = 'Invoice number must be at most 50 characters.';
    }
  }

  if (body.status !== undefined && !['draft', 'paid'].includes(body.status)) {
    errors.status = 'Status must be "draft" or "paid".';
  }

  const items = body.items;
  const itemErrors = [];
  if (!Array.isArray(items) || items.length === 0) {
    errors.items = 'At least one invoice item is required.';
  } else {
    items.forEach((item, index) => {
      const itemError = {};
      if (!isNonEmptyString(item.description)) {
        itemError.description = 'Description is required.';
      } else if (item.description.trim().length > MAX_TEXT_LENGTH) {
        itemError.description = `Description must be at most ${MAX_TEXT_LENGTH} characters.`;
      }

      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        itemError.quantity = 'Quantity must be a positive number.';
      } else if (quantity > 1000000) {
        itemError.quantity = 'Quantity is too large.';
      }

      const unitPrice = Number(item.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        itemError.unitPrice = 'Unit price must be zero or a positive number.';
      } else if (unitPrice > 100000000) {
        itemError.unitPrice = 'Unit price is too large.';
      }

      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });

    if (itemErrors.length > 0) {
      errors.itemDetails = itemErrors;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('Validation failed.', errors);
  }

  return {
    customerId: Number(body.customerId),
    invoiceDate: body.invoiceDate,
    invoiceNumber: body.invoiceNumber ? body.invoiceNumber.trim() : null,
    status: body.status || 'draft',
    items: items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  };
}

module.exports = { validateCustomerInput, validateInvoiceInput };
