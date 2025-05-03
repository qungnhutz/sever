const express = require('express');
const router = express.Router();

const ControllerBooksInStock = require('../Controller/ControllerBooksInStock');
// books
router.get('/api/exportBooksInStock', ControllerBooksInStock.exportBooksInStock);
router.get('/api/GetBooksInStock', ControllerBooksInStock.GetBooksInStock);
module.exports = router;
