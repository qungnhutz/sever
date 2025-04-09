const express = require('express');
const router = express.Router();

const ControllerHandleBook = require('../Controller/ControlerHandleBook');
router.post('/api/requestborrowbook', ControllerHandleBook.RequestBorrowBook);
//router.get('/api/updateOrdueStatus', ControllerHandleBook.updateOverdueStatus);
router.post('/api/cancelUnconfirmedBorrows', ControllerHandleBook.cancelUnconfirmedBorrows);
router.post('/api/confirmBorrowRequest', ControllerHandleBook.confirmBorrowRequest);
router.post('/api/ReturnBook', ControllerHandleBook.ReturnBook);
router.post('/api/ExtendBorrowing', ControllerHandleBook.ExtendBorrowing);
router.get('/api/GetBorrowedBooks', ControllerHandleBook.GetBorrowedBooks);
router.get('/api/GetBorrowById', ControllerHandleBook.GetBorrowById);
router.get('/api/GetBorrowsByStudent', ControllerHandleBook.GetBorrowsByStudent);
router.get('/api/SearchBorrows', ControllerHandleBook.SearchBorrows);
module.exports = router;