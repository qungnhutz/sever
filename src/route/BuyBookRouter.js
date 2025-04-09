const express = require('express');
const router = express.Router();

const ControllerBuyBook = require('../Controller/ControllerBuyBook');
router.get('/api/suggestBooksToBuy', ControllerBuyBook.suggestBooksToBuy);
router.get('/api/exportBuyBook', ControllerBuyBook.exportBuyBook);
router.get('/api/getAllBuyBooks', ControllerBuyBook.getAllBuyBooks);
router.delete('/api/deleteAllBuyBooks', ControllerBuyBook.deleteAllBuyBooks);
router.delete('/api/deleteBuyBook', ControllerBuyBook.deleteBuyBook);
router.put('/api/editBuyBook', ControllerBuyBook.editBuyBook);
router.post('/api/addBuyBook', ControllerBuyBook.addBuyBook);
module.exports = router;