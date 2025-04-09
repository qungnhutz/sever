const express = require('express');
const router = express.Router();
const ControllerReport = require('../Controller/ControllerReport');

router.get('/api/getBookBorrowByMonth', ControllerReport.getBookBorrowByMonth);
router.get('/api/exportBookBorrow', ControllerReport.exportBookBorrow);
module.exports = router;
