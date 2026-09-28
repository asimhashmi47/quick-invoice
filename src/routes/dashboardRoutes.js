const express = require('express');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

router.get('/', invoiceController.dashboard);

module.exports = router;
