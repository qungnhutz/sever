const ModelHandleBook = require('../Model/ModelHandleBook');
const ModelBook = require('../Model/ModelBook');
const ModelUser = require('../Model/ModelUser');
const ModelReader = require('../Model/ModelReader');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const diacritics = require('diacritics');

function generateRandomMaPhieu(length = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `MP${result}`; // Ví dụ: MP3JF9
}


class ControllerHandleBook {

    async GetBorrowsByStudent(req, res) {
        try {
            const token = req.cookies?.Token || req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập lại!' });
            }

            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Lỗi cấu hình server, thiếu JWT_SECRET!' });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
            }

            const masinhvien = decoded.masinhvien;

            const borrowRecords = await ModelHandleBook.find({ masinhvien });
            if (!borrowRecords.length) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn nào!' });
            }

            const bookIds = borrowRecords.flatMap(borrow => borrow.books.map(book => book.masach));
            const books = await ModelBook.find({ masach: { $in: bookIds } });

            const borrowList = borrowRecords.map(borrow => ({
                maphieumuon: borrow.maphieumuon,
                masinhvien: borrow.masinhvien,
                books: borrow.books.map(book => {
                    const matchedBook = books.find(b => b.masach === book.masach);
                    return {
                        masach: book.masach,
                        tensach: matchedBook ? matchedBook.tensach : 'Không tìm thấy',
                        mavitri: book.mavitri,
                        soluong: book.soluong,
                        ngaytra: book.ngaytra,
                        newngayhentra: book.newngayhentra, // Giữ lại newngayhentra
                        tinhtrang: book.tinhtrang,
                        confirm: book.confirm,
                        giahan: book.giahan
                    };
                }),
                ngaymuon: borrow.ngaymuon,
                ngayhentra: borrow.ngayhentra
            }));

            return res.status(200).json({ message: 'Danh sách phiếu mượn', data: borrowList });
        } catch (error) {
            console.error("Lỗi khi lấy phiếu mượn theo sinh viên:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau!' });
        }
    }

    async AdminExtendAllBooks(req, res) {
        try {
            const { maphieumuon } = req.body;

            // Kiểm tra dữ liệu đầu vào
            if (!maphieumuon) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn !!!' });
            }

            // Tìm phiếu mượn
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(),
                'books.tinhtrang': false
            });
            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hoặc không có sách chưa trả !!!' });
            }

            // Kiểm tra sách chưa trả
            const unreturnedBooks = borrowRecord.books.filter(book => !book.tinhtrang);
            if (unreturnedBooks.length === 0) {
                return res.status(400).json({ message: 'Tất cả sách trong phiếu mượn đã được trả !!!' });
            }

            // Kiểm tra sách đã gia hạn
            const alreadyExtendedBooks = unreturnedBooks.filter(book => book.giahan);
            if (alreadyExtendedBooks.length > 0) {
                return res.status(400).json({
                    message: `Các sách sau đã được gia hạn, không thể gia hạn thêm: ${alreadyExtendedBooks.map(b => b.masach).join(', ')} !!!`
                });
            }

            // Tìm thông tin người đọc dựa trên masinhvien
            const masinhvien = borrowRecord.masinhvien;
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người đọc !!!' });
            }

            // Tính ngày gia hạn mới
            const currentNgayHenTra = moment(borrowRecord.ngayhentra);
            let newNgayHenTra;
            if (reader.typereader === 'Sinh viên') {
                newNgayHenTra = currentNgayHenTra.add(10, 'days').toDate();
            } else if (reader.typereader === 'Giảng viên') {
                newNgayHenTra = currentNgayHenTra.add(15, 'days').toDate();
            } else {
                return res.status(400).json({ message: 'Loại người đọc không hợp lệ !!!' });
            }

            // Cập nhật gia hạn cho tất cả sách chưa trả
            for (const book of borrowRecord.books) {
                if (!book.tinhtrang) {
                    book.newngayhentra = newNgayHenTra;
                    book.giahan = true;
                }
            }

            await borrowRecord.save();

            return res.status(200).json({
                message: `Gia hạn tất cả sách trong phiếu mượn ${maphieumuon} thành công bởi admin !!!`,
                data: {
                    maphieumuon: borrowRecord.maphieumuon,
                    masinhvien,
                    books: borrowRecord.books,
                    newngayhentra: newNgayHenTra,
                    typereader: reader.typereader
                }
            });
        } catch (error) {
            console.error("Lỗi khi admin gia hạn tất cả sách:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại !!!' });
        }
    }

    async ExtendAllBooks(req, res) {
        try {
            // Lấy masinhvien từ token
            const token = req.cookies.Token;
            if (!token) {
                return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập lại !!!' });
            }
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Lỗi cấu hình server, thiếu JWT_SECRET !!!' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const masinhvien = decoded.masinhvien;

            const { maphieumuon } = req.body;
            if (!maphieumuon) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn !!!' });
            }

            // Tìm phiếu mượn
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(),
                masinhvien,
                'books.tinhtrang': false
            });
            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hoặc không có sách chưa trả !!!' });
            }

            // Kiểm tra sách chưa trả
            const unreturnedBooks = borrowRecord.books.filter(book => !book.tinhtrang);
            if (unreturnedBooks.length === 0) {
                return res.status(400).json({ message: 'Tất cả sách trong phiếu mượn đã được trả !!!' });
            }

            // Kiểm tra thông tin người đọc
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người đọc !!!' });
            }

            // Kiểm tra sách đã gia hạn
            const alreadyExtendedBooks = unreturnedBooks.filter(book => book.giahan);
            if (alreadyExtendedBooks.length > 0) {
                return res.status(400).json({
                    message: `Các sách sau đã được gia hạn, không thể gia hạn thêm: ${alreadyExtendedBooks.map(b => b.masach).join(', ')} !!!`
                });
            }

            // Tính ngày gia hạn mới
            const currentNgayHenTra = moment(borrowRecord.ngayhentra);
            let newNgayHenTra;
            if (reader.typereader === 'Sinh viên') {
                newNgayHenTra = currentNgayHenTra.add(10, 'days').toDate();
            } else if (reader.typereader === 'Giảng viên') {
                newNgayHenTra = currentNgayHenTra.add(15, 'days').toDate();
            } else {
                return res.status(400).json({ message: 'Loại người đọc không hợp lệ !!!' });
            }

            // Cập nhật gia hạn cho tất cả sách chưa trả
            for (const book of borrowRecord.books) {
                if (!book.tinhtrang) {
                    book.newngayhentra = newNgayHenTra;
                    book.giahan = true;
                }
            }

            await borrowRecord.save();

            return res.status(200).json({
                message: `Gia hạn tất cả sách trong phiếu mượn ${maphieumuon} thành công !!!`,
                data: {
                    maphieumuon: borrowRecord.maphieumuon,
                    masinhvien,
                    books: borrowRecord.books,
                    newngayhentra: newNgayHenTra,
                    typereader: reader.typereader
                }
            });
        } catch (error) {
            console.error("Lỗi khi gia hạn tất cả sách:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại !!!' });
        }
    }

    async ReturnAllBooks(req, res) {
        try {
            const { maphieumuon, ngaytra } = req.body;

            // Kiểm tra dữ liệu đầu vào
            if (!maphieumuon || !ngaytra) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn và ngày trả !!!' });
            }

            // Tìm phiếu mượn
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(),
                'books.tinhtrang': false
            });
            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hoặc không có sách chưa trả !!!' });
            }

            // Kiểm tra xem có sách chưa trả hay không
            const unreturnedBooks = borrowRecord.books.filter(book => !book.tinhtrang);
            if (unreturnedBooks.length === 0) {
                return res.status(400).json({ message: 'Tất cả sách trong phiếu mượn đã được trả !!!' });
            }

            // Cập nhật trạng thái trả sách
            for (const book of borrowRecord.books) {
                if (!book.tinhtrang) {
                    book.tinhtrang = true;
                    book.ngaytra = moment.utc(ngaytra, 'YYYY-MM-DD').toDate();

                    // Cập nhật số lượng mượn trong ModelBook
                    const bookDoc = await ModelBook.findOne({ masach: book.masach });
                    if (!bookDoc) {
                        return res.status(404).json({ message: `Không tìm thấy sách với mã ${book.masach} !!!` });
                    }

                    const vitriIndex = bookDoc.vitri.findIndex(v => v.mavitri === book.mavitri);
                    if (vitriIndex === -1) {
                        return res.status(404).json({ message: `Không tìm thấy vị trí ${book.mavitri} cho sách ${book.masach} !!!` });
                    }

                    if (bookDoc.vitri[vitriIndex].soluongmuon < book.soluong) {
                        throw new Error(`Số lượng mượn tại vị trí ${book.mavitri} không hợp lệ!`);
                    }
                    bookDoc.vitri[vitriIndex].soluongmuon -= book.soluong;
                    await bookDoc.save();
                }
            }

            await borrowRecord.save();

            return res.status(200).json({ message: 'Trả tất cả sách trong phiếu mượn thành công !!!', data: borrowRecord });
        } catch (error) {
            console.error("Lỗi khi trả tất cả sách:", error);
            return res.status(500).json({ message: error.message || 'Lỗi máy chủ !!!' });
        }
    }

    async SearchBorrowRecords(req, res) {
        try {
            const { timphieu } = req.body

            // Kiểm tra đầu vào
            if (!timphieu) {
                return res.status(400).json({ message: `Vui lòng nhập từ khóa tìm kiếm (timphieu) !!!${timphieu}` });
            }

            // Chuẩn hóa từ khóa tìm kiếm
            const normalizedSearch = diacritics.remove(timphieu.trim()).toLowerCase();

            // Lấy tất cả phiếu mượn
            const borrowRecords = await ModelHandleBook.find();
            if (!borrowRecords.length) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn nào !!!' });
            }

            // Lấy tất cả sách để ánh xạ tensach
            const bookIds = borrowRecords.flatMap(borrow => borrow.books.map(book => book.masach));
            const books = await ModelBook.find({ masach: { $in: bookIds } });

            // Lọc phiếu mượn dựa trên timphieu
            const filteredBorrowRecords = borrowRecords.filter(borrow => {
                // Chuẩn hóa các trường gốc
                const normalizedMaphieumuon = diacritics.remove(borrow.maphieumuon).toLowerCase();
                const normalizedMasinhvien = diacritics.remove(borrow.masinhvien).toLowerCase();
                const normalizedNgaymuon = borrow.ngaymuon ? diacritics.remove(borrow.ngaymuon.toISOString()).toLowerCase() : '';
                const normalizedNgayhentra = borrow.ngayhentra ? diacritics.remove(borrow.ngayhentra.toISOString()).toLowerCase() : '';

                // Kiểm tra các trường gốc
                if (
                    normalizedMaphieumuon.includes(normalizedSearch) ||
                    normalizedMasinhvien.includes(normalizedSearch) ||
                    normalizedNgaymuon.includes(normalizedSearch) ||
                    normalizedNgayhentra.includes(normalizedSearch)
                ) {
                    return true;
                }

                // Kiểm tra các trường trong mảng books
                return borrow.books.some(book => {
                    const matchedBook = books.find(b => b.masach === book.masach);
                    const normalizedTensach = matchedBook ? diacritics.remove(matchedBook.tensach).toLowerCase() : '';
                    const normalizedMasach = diacritics.remove(book.masach).toLowerCase();
                    const normalizedMavitri = diacritics.remove(book.mavitri).toLowerCase();
                    const normalizedSoluong = book.soluong ? book.soluong.toString().toLowerCase() : '';
                    const normalizedNgaytra = book.ngaytra ? diacritics.remove(book.ngaytra.toISOString()).toLowerCase() : '';
                    const normalizedNewngayhentra = book.newngayhentra ? diacritics.remove(book.newngayhentra.toISOString()).toLowerCase() : '';
                    const normalizedTinhtrang = book.tinhtrang ? book.tinhtrang.toString().toLowerCase() : '';
                    const normalizedConfirm = book.confirm ? book.confirm.toString().toLowerCase() : '';
                    const normalizedGiahan = book.giahan ? book.giahan.toString().toLowerCase() : '';

                    return (
                        normalizedTensach.includes(normalizedSearch) ||
                        normalizedMasach.includes(normalizedSearch) ||
                        normalizedMavitri.includes(normalizedSearch) ||
                        normalizedSoluong.includes(normalizedSearch) ||
                        normalizedNgaytra.includes(normalizedSearch) ||
                        normalizedNewngayhentra.includes(normalizedSearch) ||
                        normalizedTinhtrang.includes(normalizedSearch) ||
                        normalizedConfirm.includes(normalizedSearch) ||
                        normalizedGiahan.includes(normalizedSearch)
                    );
                });
            });

            if (!filteredBorrowRecords.length) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn phù hợp với từ khóa !!!' });
            }

            // Ánh xạ dữ liệu trả về
            const borrowList = filteredBorrowRecords.map(borrow => ({
                maphieumuon: borrow.maphieumuon,
                masinhvien: borrow.masinhvien,
                books: borrow.books.map(book => {
                    const matchedBook = books.find(b => b.masach === book.masach);
                    return {
                        masach: book.masach,
                        tensach: matchedBook ? matchedBook.tensach : 'Không tìm thấy',
                        mavitri: book.mavitri,
                        soluong: book.soluong,
                        ngaytra: book.ngaytra,
                        newngayhentra: book.newngayhentra,
                        tinhtrang: book.tinhtrang,
                        confirm: book.confirm,
                        giahan: book.giahan
                    };
                }),
                ngaymuon: borrow.ngaymuon,
                ngayhentra: borrow.ngayhentra
            }));

            return res.status(200).json({ message: 'Danh sách phiếu mượn', data: borrowList });
        } catch (error) {
            console.error("Lỗi khi tìm phiếu mượn:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async RequestBorrowBook(req, res) {
        try {
            // Lấy masinhvien từ token
            const token = req.cookies.Token;
            if (!token) return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập lại !!!' });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const masinhvien = decoded.masinhvien;

            // Kiểm tra thông tin người dùng
            const user = await ModelUser.findOne({ masinhvien });
            const reader = await ModelReader.findOne({ masinhvien });
            if (!user || !reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng !!!' });
            }

            // Xử lý dữ liệu đầu vào
            let books, ngaymuon;
            if (Array.isArray(req.body)) {
                // Nếu req.body là mảng, xử lý để lấy books và ngaymuon
                books = req.body.filter(item => item.masach).map(item => ({
                    masach: item.masach,
                    mavitri: item.mavitri,
                    soluong: item.soluong || 0 // Đảm bảo soluong luôn có giá trị
                }));
                const ngaymuonObj = req.body.find(item => item.ngaymuon);
                ngaymuon = ngaymuonObj ? ngaymuonObj.ngaymuon : null;
            } else {
                // Nếu req.body là object, lấy như cũ
                books = req.body.books.map(item => ({
                    masach: item.masach,
                    mavitri: item.mavitri,
                    soluong: item.soluong || 0 // Đảm bảo soluong luôn có giá trị
                }));
                ngaymuon = req.body.ngaymuon;
            }

            // Kiểm tra dữ liệu
            if (!books || !Array.isArray(books) || books.length === 0 || !ngaymuon) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin sách (masach, mavitri, soluong) và ngày mượn !!!' });
            }

            // Kiểm tra ngày mượn hợp lệ
            const today = moment().startOf('day');
            const borrowDate = moment.utc(ngaymuon, 'YYYY-MM-DD');
            if (borrowDate.isBefore(today)) {
                return res.status(400).json({ message: 'Ngày mượn không được trước ngày hiện tại !!!' });
            }

            // Kiểm tra giới hạn số sách được mượn
            const borrowedBooks = await ModelHandleBook.find({ masinhvien, 'books.tinhtrang': false });
            const totalBorrowed = borrowedBooks.reduce((sum, item) =>
                sum + item.books.reduce((acc, book) => acc + (book.tinhtrang ? 0 : book.soluong), 0), 0);
            const maxBooks = reader.typereader === 'Sinh viên' ? 6 : 9;
            const requestedBooks = books.reduce((sum, book) => sum + book.soluong, 0);

            if (totalBorrowed + requestedBooks > maxBooks) {
                return res.status(400).json({ message: `Bạn chỉ được mượn tối đa ${maxBooks} quyển sách !!!` });
            }

            // Kiểm tra thông tin sách và vị trí
            const bookDetails = [];
            for (const { masach, mavitri, soluong } of books) {
                if (!masach || !mavitri || !soluong || soluong <= 0) {
                    return res.status(400).json({ message: `Thông tin sách không đầy đủ hoặc không hợp lệ: masach=${masach}, mavitri=${mavitri}, soluong=${soluong} !!!` });
                }

                const book = await ModelBook.findOne({ masach });
                if (!book) {
                    return res.status(404).json({ message: `Không tìm thấy sách với mã ${masach} !!!` });
                }

                const vitriIndex = book.vitri.findIndex(v => v.mavitri === mavitri);
                if (vitriIndex === -1) {
                    return res.status(404).json({ message: `Không tìm thấy vị trí ${mavitri} cho sách ${masach} !!!` });
                }

                const availableBooks = book.vitri[vitriIndex].soluong - book.vitri[vitriIndex].soluongmuon;
                if (availableBooks < soluong) {
                    return res.status(400).json({ message: `Không đủ sách ${masach} tại vị trí ${mavitri} để mượn, chỉ còn ${availableBooks} quyển !!!` });
                }

                bookDetails.push({ book, vitriIndex, soluong, masach, mavitri });
            }

            const newmaphieumuon = generateRandomMaPhieu();

            // Tính ngày hẹn trả dựa trên loại người đọc
            const daysToAdd = reader.typereader === 'Sinh viên' ? 30 : 45;
            const ngayhentra = moment.utc(ngaymuon).add(daysToAdd, 'days').toDate();

            // Tạo phiếu mượn mới
            const newBorrow = new ModelHandleBook({
                maphieumuon: newmaphieumuon,
                masinhvien,
                books: books.map(book => ({
                    masach: book.masach,
                    mavitri: book.mavitri,
                    soluong: book.soluong,
                    ngaytra: null,
                    newngayhentra: null,
                    tinhtrang: false,
                    confirm: false,
                    giahan: false
                })),
                ngaymuon: borrowDate.toDate(),
                ngayhentra
            });

            await newBorrow.save();

            // Cập nhật số lượng mượn trong ModelBook
            for (const { book, vitriIndex, soluong } of bookDetails) {
                book.vitri[vitriIndex].soluongmuon += soluong;
                if (book.vitri[vitriIndex].soluongmuon > book.vitri[vitriIndex].soluong) {
                    throw new Error(`Số lượng mượn tại vị trí ${book.vitri[vitriIndex].mavitri} vượt quá số lượng có sẵn (${book.vitri[vitriIndex].soluong})!`);
                }
                await book.save();
            }

            return res.status(200).json({ message: 'Yêu cầu mượn sách thành công !!!', data: newBorrow });
        } catch (error) {
            console.error("Lỗi khi yêu cầu mượn sách:", error);
            return res.status(500).json({ message: error.message || 'Lỗi máy chủ, vui lòng thử lại !!!' });
        }
    }

    async AdminRequestBorrowBook(req, res) {
        try {
            const { masinhvien, ngaymuon, books } = req.body;

            // Kiểm tra dữ liệu đầu vào
            if (!masinhvien || !ngaymuon || !books || !Array.isArray(books) || books.length === 0) {
                return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin: mã sinh viên, ngày mượn, và danh sách sách!' });
            }

            // Validate each book entry
            for (const book of books) {
                const { masach, mavitri, soluong } = book;
                if (!masach || !mavitri || !soluong || soluong <= 0) {
                    return res.status(400).json({
                        message: `Thông tin sách ${masach || 'không xác định'} không hợp lệ: phải có mã sách, mã vị trí, và số lượng lớn hơn 0!`
                    });
                }
            }

            // Kiểm tra thông tin người dùng
            const user = await ModelUser.findOne({ masinhvien });
            const reader = await ModelReader.findOne({ masinhvien });
            if (!user || !reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng!' });
            }

            // Kiểm tra ngày mượn hợp lệ
            const today = moment().startOf('day');
            const borrowDate = moment.utc(ngaymuon, 'YYYY-MM-DD');
            if (borrowDate.isBefore(today)) {
                return res.status(400).json({ message: 'Ngày mượn không được trước ngày hiện tại!' });
            }

            // Kiểm tra giới hạn số sách được mượn
            const borrowedBooks = await ModelHandleBook.find({ masinhvien, 'books.tinhtrang': false });
            const totalBorrowed = borrowedBooks.reduce((sum, item) =>
                sum + item.books.reduce((acc, book) => acc + (book.tinhtrang ? 0 : book.soluong), 0), 0);
            const maxBooks = reader.typereader === 'Sinh viên' ? 6 : 9;
            const requestedBooks = books.reduce((sum, book) => sum + book.soluong, 0);

            if (totalBorrowed + requestedBooks > maxBooks) {
                return res.status(400).json({ message: `Người dùng chỉ được mượn tối đa ${maxBooks} quyển sách! Hiện tại đã mượn ${totalBorrowed} sách.` });
            }

            // Kiểm tra thông tin sách và vị trí
            const errors = [];
            const bookUpdates = []; // Store updates for book quantities

            for (const book of books) {
                const { masach, mavitri, soluong } = book;

                // Find book
                const bookDoc = await ModelBook.findOne({ masach });
                if (!bookDoc) {
                    errors.push({ masach, message: `Không tìm thấy sách với mã ${masach}!` });
                    continue;
                }

                // Check location
                const vitriIndex = bookDoc.vitri.findIndex(v => v.mavitri === mavitri);
                if (vitriIndex === -1) {
                    errors.push({ masach, message: `Không tìm thấy vị trí ${mavitri} cho sách ${masach}!` });
                    continue;
                }

                // Check availability
                const availableBooks = bookDoc.vitri[vitriIndex].soluong - bookDoc.vitri[vitriIndex].soluongmuon;
                if (availableBooks < soluong) {
                    errors.push({ masach, message: `Không đủ sách ${masach} tại vị trí ${mavitri}, chỉ còn ${availableBooks} quyển!` });
                    continue;
                }

                // Store update for later
                bookUpdates.push({ bookDoc, vitriIndex, soluong });
            }

            // If any errors, return them
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            // Tạo mã phiếu mượn ngẫu nhiên
            const newmaphieumuon = generateRandomMaPhieu();

            // Tính ngày hẹn trả dựa trên loại người đọc
            const daysToAdd = reader.typereader === 'Sinh viên' ? 30 : 45;
            const ngayhentra = moment.utc(ngaymuon).add(daysToAdd, 'days').toDate();

            // Tạo phiếu mượn mới với nhiều sách
            const newBorrow = new ModelHandleBook({
                maphieumuon: newmaphieumuon,
                masinhvien,
                books: books.map(book => ({
                    masach: book.masach,
                    mavitri: book.mavitri,
                    soluong: book.soluong,
                    ngaytra: null,
                    newngayhentra: null,
                    tinhtrang: false,
                    confirm: true, // Admin tạo phiếu mượn thì tự động xác nhận
                    giahan: false
                })),
                ngaymuon: borrowDate.toDate(),
                ngayhentra
            });

            await newBorrow.save();

            // Cập nhật số lượng mượn trong ModelBook
            for (const update of bookUpdates) {
                const { bookDoc, vitriIndex, soluong } = update;
                bookDoc.vitri[vitriIndex].soluongmuon += soluong;
                if (bookDoc.vitri[vitriIndex].soluongmuon > bookDoc.vitri[vitriIndex].soluong) {
                    throw new Error(`Số lượng mượn tại vị trí ${bookDoc.vitri[vitriIndex].mavitri} vượt quá số lượng có sẵn (${bookDoc.vitri[vitriIndex].soluong})!`);
                }
                await bookDoc.save();
            }

            return res.status(200).json({ message: 'Tạo phiếu mượn sách thành công!', data: newBorrow });
        } catch (error) {
            console.error("Lỗi khi admin tạo phiếu mượn sách:", error);
            return res.status(500).json({ message: error.message || 'Lỗi máy chủ, vui lòng thử lại!' });
        }
    }

    async ReturnBook(req, res) {
        try {
            const { maphieumuon, masach, ngaytra } = req.body;
            if (!maphieumuon || !masach || !ngaytra) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn, mã sách và ngày trả !!!' });
            }

                const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(),
                'books.masach': masach.trim(),
                'books.tinhtrang': false
            });
            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hoặc sách chưa trả !!!' });
            }

            const bookIndex = borrowRecord.books.findIndex(b => b.masach === masach && !b.tinhtrang);
            if (bookIndex === -1) {
                return res.status(404).json({ message: 'Không tìm thấy sách chưa trả trong phiếu mượn !!!' });
            }

            borrowRecord.books[bookIndex].tinhtrang = true;
            borrowRecord.books[bookIndex].ngaytra = moment(ngaytra, 'YYYY-MM-DD').toDate();
            const borrowedBook = borrowRecord.books[bookIndex];

            await borrowRecord.save();

            const book = await ModelBook.findOne({ masach });
            if (!book) {
                return res.status(404).json({ message: 'Không tìm thấy sách !!!' });
            }

            const vitriIndex = book.vitri.findIndex(v => v.mavitri === borrowedBook.mavitri);
            if (vitriIndex === -1) {
                return res.status(404).json({ message: 'Không tìm thấy vị trí sách !!!' });
            }

            if (book.vitri[vitriIndex].soluongmuon < borrowedBook.soluong) {
                throw new Error(`Số lượng mượn tại vị trí ${borrowedBook.mavitri} không hợp lệ!`);
            }
            book.vitri[vitriIndex].soluongmuon -= borrowedBook.soluong;
            await book.save();

            return res.status(200).json({ message: 'Trả sách thành công !!!', data: borrowRecord });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: error.message || 'Lỗi máy chủ !!!' });
        }
    }

    async confirmBorrowRequest(req, res) {
        try {
            const { maphieumuon } = req.body;
            if (!maphieumuon) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn !!!' });
            }

            const borrowRequest = await ModelHandleBook.findOne({ maphieumuon: maphieumuon.trim() });
            if (!borrowRequest) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu mượn sách !!!' });
            }

            borrowRequest.books.forEach(book => {
                book.confirm = true;
            });

            await borrowRequest.save();

            return res.status(200).json({ message: 'Xác nhận thành công !!!', data: borrowRequest });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async ExtendBorrowing(req, res) {
        try {
            // Kiểm tra token
            const token = req.cookies.Token;
            if (!token) {
                return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập lại !!!' });
            }
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Lỗi cấu hình server, thiếu JWT_SECRET !!!' });
            }

            // Giải mã token để lấy masinhvien
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const masinhvien = decoded.masinhvien;

            // Lấy dữ liệu từ body
            const { maphieumuon, masach } = req.body;
            if (!maphieumuon || !masach) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn và mã sách !!!' });
            }

            // Tìm phiếu mượn
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(),
                masinhvien,
                'books.masach': masach.trim(),
                'books.tinhtrang': false
            });

            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hoặc sách đã được trả !!!' });
            }

            // Tìm sách cần gia hạn trong phiếu mượn
            const bookIndex = borrowRecord.books.findIndex(b => b.masach === masach && !b.tinhtrang);
            if (bookIndex === -1) {
                return res.status(404).json({ message: 'Không tìm thấy sách chưa trả trong phiếu mượn !!!' });
            }

            // Kiểm tra xem sách đã được gia hạn chưa
            if (borrowRecord.books[bookIndex].giahan) {
                return res.status(400).json({ message: 'Sách này đã được gia hạn, không thể gia hạn thêm !!!' });
            }

            // Lấy thông tin người đọc để xác định loại người đọc
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người đọc !!!' });
            }

            // Tính ngày hẹn trả mới dựa trên loại người đọc
            const currentNgayHenTra = moment(borrowRecord.ngayhentra);
            let newNgayHenTra;
            if (reader.typereader === 'Sinh viên') {
                newNgayHenTra = currentNgayHenTra.add(10, 'days').toDate();
            } else if (reader.typereader === 'Giảng viên') {
                newNgayHenTra = currentNgayHenTra.add(15, 'days').toDate();
            } else {
                return res.status(400).json({ message: 'Loại người đọc không hợp lệ !!!' });
            }

            // Cập nhật newngayhentra cho sách được gia hạn
            borrowRecord.books[bookIndex].newngayhentra = newNgayHenTra;

            // Đánh dấu sách đã được gia hạn
            borrowRecord.books[bookIndex].giahan = true;

            // Lưu thay đổi
            await borrowRecord.save();

            return res.status(200).json({
                message: `Gia hạn sách ${masach} thành công !!!`,
                data: {
                    maphieumuon: borrowRecord.maphieumuon,
                    masach: masach,
                    newngayhentra: newNgayHenTra,
                    typereader: reader.typereader
                }
            });
        } catch (error) {
            console.error("Lỗi khi gia hạn sách:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại !!!' });
        }
    }

    async cancelUnconfirmedBorrows(req, res) {
        try {
            const fiveDaysAgo = moment().subtract(5, 'days').toDate();

            // Tìm các phiếu mượn có ít nhất một sách chưa xác nhận và quá 5 ngày
            const expiredRequests = await ModelHandleBook.find({
                ngaymuon: { $lte: fiveDaysAgo }
            });

            let deletedForms = 0;
            let updatedForms = 0;

            for (const request of expiredRequests) {
                // Kiểm tra nếu tất cả sách trong phiếu mượn đều chưa xác nhận
                const allUnconfirmed = request.books.every(book => !book.confirm);

                if (allUnconfirmed) {
                    // Nếu tất cả sách đều chưa xác nhận, xóa toàn bộ phiếu mượn
                    for (const book of request.books) {
                        const bookDoc = await ModelBook.findOne({ masach: book.masach });
                        const vitriIndex = bookDoc.vitri.findIndex(v => v.mavitri === book.mavitri);
                        if (vitriIndex !== -1 && bookDoc.vitri[vitriIndex].soluongmuon >= book.soluong) {
                            await ModelBook.findOneAndUpdate(
                                { masach: book.masach, 'vitri.mavitri': book.mavitri },
                                { $inc: { 'vitri.$.soluongmuon': -book.soluong } }
                            );
                        } else {
                            console.warn(`Số lượng mượn không hợp lệ cho sách ${book.masach} tại vị trí ${book.mavitri}`);
                        }
                    }
                    await ModelHandleBook.deleteOne({ _id: request._id });
                    console.log(`Đã xóa phiếu mượn có ID: ${request.maphieumuon} (tất cả sách chưa xác nhận)`);
                    deletedForms++;
                } else {
                    // Nếu chỉ một số sách chưa xác nhận, xóa các sách đó khỏi mảng books
                    const booksToKeep = [];
                    for (const book of request.books) {
                        if (!book.confirm) {
                            const bookDoc = await ModelBook.findOne({ masach: book.masach });
                            const vitriIndex = bookDoc.vitri.findIndex(v => v.mavitri === book.mavitri);
                            if (vitriIndex !== -1 && bookDoc.vitri[vitriIndex].soluongmuon >= book.soluong) {
                                await ModelBook.findOneAndUpdate(
                                    { masach: book.masach, 'vitri.mavitri': book.mavitri },
                                    { $inc: { 'vitri.$.soluongmuon': -book.soluong } }
                                );
                                console.log(`Đã xóa sách ${book.masach} khỏi phiếu mượn ${request.maphieumuon}`);
                            } else {
                                console.warn(`Số lượng mượn không hợp lệ cho sách ${book.masach} tại vị trí ${book.mavitri}`);
                            }
                        } else {
                            booksToKeep.push(book);
                        }
                    }

                    // Cập nhật mảng books của phiếu mượn
                    request.books = booksToKeep;

                    // Nếu mảng books rỗng sau khi xóa, xóa phiếu mượn
                    if (request.books.length === 0) {
                        await ModelHandleBook.deleteOne({ _id: request._id });
                        console.log(`Đã xóa phiếu mượn có ID: ${request.maphieumuon} (mảng books rỗng)`);
                        deletedForms++;
                    } else {
                        // Lưu lại phiếu mượn đã cập nhật
                        await request.save();
                        console.log(`Đã cập nhật phiếu mượn có ID: ${request.maphieumuon}`);
                        updatedForms++;
                    }
                }
            }

            return res.json({
                success: true,
                message: `Kiểm tra và hủy yêu cầu mượn sách thành công! Đã xóa ${deletedForms} phiếu mượn, cập nhật ${updatedForms} phiếu mượn.`
            });
        } catch (error) {
            console.error('Lỗi khi kiểm tra yêu cầu mượn sách:', error);
            return res.status(500).json({ success: false, message: 'Có lỗi xảy ra!' });
        }
    }

    async AdminExtendBook(req, res) {
        try {
            const { maphieumuon, masach } = req.body;

            // Kiểm tra dữ liệu đầu vào
            if (!maphieumuon || !masach) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn và mã sách !!!' });
            }

            // Tìm phiếu mượn
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(),
                'books.masach': masach.trim(),
                'books.tinhtrang': false
            });
            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hoặc sách đã được trả !!!' });
            }

            // Tìm sách trong phiếu mượn
            const bookIndex = borrowRecord.books.findIndex(b => b.masach === masach && !b.tinhtrang);
            if (bookIndex === -1) {
                return res.status(404).json({ message: 'Không tìm thấy sách chưa trả trong phiếu mượn !!!' });
            }

            // Kiểm tra sách đã gia hạn
            if (borrowRecord.books[bookIndex].giahan) {
                return res.status(400).json({ message: `Sách ${masach} đã được gia hạn, không thể gia hạn thêm !!!` });
            }

            // Tìm thông tin người đọc dựa trên masinhvien
            const masinhvien = borrowRecord.masinhvien;
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người đọc !!!' });
            }

            // Tính ngày gia hạn mới
            const currentNgayHenTra = moment(borrowRecord.ngayhentra);
            let newNgayHenTra;
            if (reader.typereader === 'Sinh viên') {
                newNgayHenTra = currentNgayHenTra.add(10, 'days').toDate();
            } else if (reader.typereader === 'Giảng viên') {
                newNgayHenTra = currentNgayHenTra.add(15, 'days').toDate();
            } else {
                return res.status(400).json({ message: 'Loại người đọc không hợp lệ !!!' });
            }

            // Cập nhật thông tin gia hạn cho sách
            borrowRecord.books[bookIndex].newngayhentra = newNgayHenTra;
            borrowRecord.books[bookIndex].giahan = true;

            await borrowRecord.save();

            return res.status(200).json({
                message: `Gia hạn sách ${masach} trong phiếu mượn ${maphieumuon} thành công bởi admin !!!`,
                data: {
                    maphieumuon: borrowRecord.maphieumuon,
                    masinhvien,
                    masach,
                    newngayhentra: newNgayHenTra,
                    typereader: reader.typereader
                }
            });
        } catch (error) {
            console.error("Lỗi khi admin gia hạn sách:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại !!!' });
        }
    }


    async GetBorrowedBooks(req, res) {
        try {
            const borrowRecords = await ModelHandleBook.find();

            const bookIds = borrowRecords.flatMap(record => record.books.map(book => book.masach));
            const books = await ModelBook.find({ masach: { $in: bookIds } });

            const result = borrowRecords.map(record => ({
                maphieumuon: record.maphieumuon,
                masinhvien: record.masinhvien,
                books: record.books.map(book => {
                    const matchedBook = books.find(b => b.masach === book.masach);
                    return {
                        masach: book.masach,
                        tensach: matchedBook ? matchedBook.tensach : 'Không tìm thấy',
                        mavitri: book.mavitri,
                        soluong: book.soluong,
                        ngaytra: book.ngaytra,
                        newngayhentra: book.newngayhentra, // Giữ lại newngayhentra
                        tinhtrang: book.tinhtrang,
                        confirm: book.confirm,
                        giahan: book.giahan
                    };
                }),
                ngaymuon: record.ngaymuon,
                ngayhentra: record.ngayhentra
            }));

            return res.status(200).json(result);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách phiếu mượn:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }
}

module.exports = new ControllerHandleBook();