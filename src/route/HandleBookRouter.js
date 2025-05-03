const express = require('express');
const router = express.Router();

const ControllerHandleBook = require('../Controller/ControlerHandleBook');
router.post('/api/requestborrowbook', ControllerHandleBook.RequestBorrowBook);
router.get('/api/cancelUnconfirmedBorrows', ControllerHandleBook.cancelUnconfirmedBorrows);
router.post('/api/confirmBorrowRequest', ControllerHandleBook.confirmBorrowRequest);
router.post('/api/ReturnBook', ControllerHandleBook.ReturnBook);
router.post('/api/ExtendBorrowing', ControllerHandleBook.ExtendBorrowing);
router.get('/api/GetBorrowedBooks', ControllerHandleBook.GetBorrowedBooks);
router.get('/api/GetBorrowsByStudent', ControllerHandleBook.GetBorrowsByStudent);
router.post('/api/SearchBorrowRecords', ControllerHandleBook.SearchBorrowRecords);
router.post('/api/ReturnAllBooks', ControllerHandleBook.ReturnAllBooks);
router.post('/api/ExtendAllBooks', ControllerHandleBook.ExtendAllBooks);
router.post('/api/AdminExtendAllBooks', ControllerHandleBook.AdminExtendAllBooks);
router.post('/api/AdminExtendBook', ControllerHandleBook.AdminExtendBook);
router.post('/api/AdminRequestBorrowBook', ControllerHandleBook.AdminRequestBorrowBook);
module.exports = router;