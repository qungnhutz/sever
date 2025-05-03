const express = require('express');
const router = express.Router();

const ControllerBook = require('../Controller/ControllerBook');
// books
router.post('/api/addbook', ControllerBook.AddBook);
router.get('/api/GetBooks', ControllerBook.GetBooks);
router.delete('/api/DeleteBook', ControllerBook.DeleteBook);
router.put('/api/UpdateBook', ControllerBook.UpdateBook);
router.get('/api/SearchProduct', ControllerBook.SearchProduct);
router.get('/api/SearchBookByMaSach', ControllerBook.SearchBookByMaSach);
router.get('/api/GetLatestUpdatedBooks', ControllerBook.GetLatestUpdatedBooks);
router.get('/api/GetMostBorrowedBooks', ControllerBook.GetMostBorrowedBooks);
//router.get('/api/FindBorrowRecordsByStudent', ControllerBook.FindBorrowRecordsByStudent);
module.exports = router;
