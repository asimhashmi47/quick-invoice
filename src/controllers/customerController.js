const customerService = require('../services/customerService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const customers = customerService.listCustomers(req.query.search);
  res.json({ success: true, data: customers });
});

const getOne = asyncHandler(async (req, res) => {
  const customer = customerService.getCustomer(Number(req.params.id));
  res.json({ success: true, data: customer });
});

const create = asyncHandler(async (req, res) => {
  const customer = customerService.createCustomer(req.body);
  res.status(201).json({ success: true, data: customer });
});

const update = asyncHandler(async (req, res) => {
  const customer = customerService.updateCustomer(Number(req.params.id), req.body);
  res.json({ success: true, data: customer });
});

const remove = asyncHandler(async (req, res) => {
  customerService.deleteCustomer(Number(req.params.id));
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
