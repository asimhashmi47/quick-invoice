const customerRepository = require('../repositories/customerRepository');
const ApiError = require('../utils/ApiError');
const { validateCustomerInput } = require('../utils/validators');

function listCustomers(search) {
  return customerRepository.findAll({ search });
}

function getCustomer(id) {
  const customer = customerRepository.findById(id);
  if (!customer) throw ApiError.notFound('Customer not found.');
  return customer;
}

function createCustomer(body) {
  const data = validateCustomerInput(body);
  return customerRepository.create(data);
}

function updateCustomer(id, body) {
  getCustomer(id);
  const data = validateCustomerInput(body, { partial: true });
  return customerRepository.update(id, data);
}

function deleteCustomer(id) {
  getCustomer(id);
  if (customerRepository.hasInvoices(id)) {
    throw ApiError.conflict('Cannot delete a customer that has invoices.');
  }
  customerRepository.remove(id);
}

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
