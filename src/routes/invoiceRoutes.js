const express = require('express');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

router.get('/', invoiceController.list);
router.get('/:id', invoiceController.getOne);
router.post('/', invoiceController.create);
router.patch('/:id/status', invoiceController.updateStatus);
router.delete('/:id', invoiceController.remove);
router.get('/:id/pdf', invoiceController.downloadPdf);

module.exports = router;
