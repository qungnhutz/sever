const express = require('express');
const router = express.Router();

const ControllerClearanceBooks = require('../Controller/ControllerClearanceBooks');
router.get('/api/exportClearanceBooks', ControllerClearanceBooks.exportClearanceBooks);
router.get('/api/getAllClearanceBooks', ControllerClearanceBooks.getAllClearanceBooks);
router.post('/api/addClearanceBook', ControllerClearanceBooks.addClearanceBook);
router.delete('/api/deleteClearanceBook', ControllerClearanceBooks.deleteClearanceBook);
router.put('/api/editClearanceBook', ControllerClearanceBooks.editClearanceBook);
router.post('/api/changeClearanceBookStatus', ControllerClearanceBooks.changeClearanceBookStatus);
module.exports = router;