const BookRouter = require('./BookRouter');
const UserRouter = require('./UserRouter');
const ReaderRouter = require('./ReaderRouter');
const EmailRouter = require('./EmailRouter');
const ReportRouter = require('./ReportRouter');
const BookGenreRouter = require('./BookGenreRouter');
const HandleBookRouter = require('./HandleBookRouter');
const BuyBookRouter = require('./BuyBookRouter');
const LocationCategoryRouter = require('./LocationCategoryRouter');
const BookInStockRouter = require('./BookInStockRouter');
const ClearanceBooksRouter = require('./ClearanceBooksRouter');
function route(app) {
    //ClearanceBooksRouter
    app.get('/api/exportClearanceBooks', ClearanceBooksRouter);
    app.get('/api/getAllClearanceBooks', ClearanceBooksRouter);
    app.post('/api/addClearanceBook', ClearanceBooksRouter);
    app.delete('/api/deleteClearanceBook', ClearanceBooksRouter);
    app.put('/api/editClearanceBook', ClearanceBooksRouter);
    app.post('/api/changeClearanceBookStatus', ClearanceBooksRouter);
    //books in stock
    app.get('/api/exportBooksInStock', BookInStockRouter);
    app.get('/api/GetBooksInStock', BookInStockRouter);
    //category
    app.get('/api/getLocationByMaViTri', LocationCategoryRouter);
    app.get('/api/getBooksByLocation', LocationCategoryRouter);
    app.delete('/api/deleteLocation', LocationCategoryRouter);
    app.put('/api/updateLocation', LocationCategoryRouter);
    app.post('/api/addLocation', LocationCategoryRouter);
    app.get('/api/getAllLocations', LocationCategoryRouter);
    app.get('/api/generateQRCodePerShelf', LocationCategoryRouter);
    app.get('/api/getBookshelf', LocationCategoryRouter);
    // Buy
    app.get('/api/suggestBooksToBuy', BuyBookRouter);
    app.get('/api/getAllBuyBooks', BuyBookRouter);
    app.get('/api/exportBuyBook', BuyBookRouter);
    app.delete('/api/deleteAllBuyBooks', BuyBookRouter);
    app.delete('/api/deleteBuyBook', BuyBookRouter);
    app.put('/api/editBuyBook', BuyBookRouter);
    app.post('/api/addBuyBook', BuyBookRouter);
    //Genre
    app.get('/api/searchCategories', BookGenreRouter);
    app.post('/api/addCategory', BookGenreRouter);
    app.delete('/api/deleteCategory', BookGenreRouter);
    app.get('/api/getAllCategories', BookGenreRouter);
    app.get('/api/getBooksByCategory', BookGenreRouter);
    app.put('/api/updateCategory', BookGenreRouter);
    //report
    app.get('/api/getBookBorrowByMonth', ReportRouter);
    app.get('/api/exportBookBorrow', ReportRouter);
    //email
    app.post('/api/sendOTP', EmailRouter);
    // user
    app.delete('/api/deleteUser', UserRouter);
    app.put('/api/updateUser', UserRouter);
    app.post('/api/createUser', UserRouter);
    app.post('/api/verifyOTP', UserRouter);
    app.get('/api/getUserByMaSinhVien', UserRouter);
    app.get('/api/getAllUsers', UserRouter);
    app.get('/api/logout', UserRouter);
    app.get('/api/getStudentFromToken', UserRouter);
    app.post('/api/login', UserRouter);
    app.put('/api/changePassword', UserRouter);
    //Reader
    app.delete('/api/deleteReader', ReaderRouter);
    app.put('/api/editReader', ReaderRouter);
    app.get('/api/getReaderByMaSinhVien', ReaderRouter);
    app.post('/api/addReader', ReaderRouter);
    app.get('/api/getAllReaders', ReaderRouter);
    // Book
    app.post('/api/addbook', BookRouter);
    app.get('/api/GetBooks', BookRouter);
    app.delete('/api/DeleteBook', BookRouter);
    app.put('/api/UpdateBook', BookRouter);
    app.get('/api/SearchProduct', BookRouter);
    app.get('/api/SearchBookByMaSach', BookRouter);
    app.get('/api/GetLatestUpdatedBooks', BookRouter);
    app.get('/api/GetMostBorrowedBooks', BookRouter);

    // HandleBook
    app.get('/api/GetBorrowsByStudent', HandleBookRouter);
    app.get('/api/GetBorrowedBooks', HandleBookRouter);
    app.post('/api/SearchBorrowRecords', HandleBookRouter);
    app.post('/api/requestborrowbook', HandleBookRouter);
    app.get('/api/cancelUnconfirmedBorrows', HandleBookRouter);
    app.post('/api/confirmBorrowRequest', HandleBookRouter);
    app.post('/api/ReturnBook', HandleBookRouter);
    app.post('/api/ExtendBorrowing', HandleBookRouter);
    app.post('/api/ReturnAllBooks', HandleBookRouter);
    app.post('/api/ExtendAllBooks', HandleBookRouter);
    app.post('/api/AdminExtendAllBooks', HandleBookRouter);
    app.post('/api/AdminExtendBook', HandleBookRouter);
    app.post('/api/AdminRequestBorrowBook', HandleBookRouter);
}

module.exports = route;