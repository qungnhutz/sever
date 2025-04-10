const ModelHandleBook = require('../Model/ModelHandleBook');
const ModelBook = require('../Model/ModelBook');
const ModelUser = require('../Model/ModelUser');
const ModelReader = require('../Model/ModelReader');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const diacritics = require('diacritics');

class ControllerHandleBook {
    async  SearchBorrows(req, res) {
        try {
            const { masinhvien, tensach } = req.query;
            let query = {};

            // 🔹 Nếu có `masinhvien`, thêm điều kiện tìm kiếm
            if (masinhvien) {
                query.masinhvien = { $regex: masinhvien.trim(), $options: "i" };
            }

            // 🔹 Nếu có `tensach`, tìm sách gần đúng
            if (tensach) {
                const normalizedSearch = diacritics.remove(tensach.trim()).toLowerCase(); // Chuyển về không dấu

                const books = await ModelBook.find();
                const matchedBooks = books.filter(book =>
                    diacritics.remove(book.tensach).toLowerCase().includes(normalizedSearch)
                );

                if (!matchedBooks.length) {
                    return res.status(404).json({ message: 'Không tìm thấy sách phù hợp !!!' });
                }

                const bookIds = matchedBooks.map(book => book.masach);
                query.masach = { $in: bookIds };
            }

            // 🔹 Truy vấn phiếu mượn theo điều kiện
            const borrowRecords = await ModelHandleBook.find(query);
            if (!borrowRecords.length) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn nào !!!' });
            }

            // 🔹 Lấy thông tin sách
            const bookIds = borrowRecords.map(borrow => borrow.masach);
            const books = await ModelBook.find({ masach: { $in: bookIds } });

            // 🔹 Tạo danh sách kết quả
            const borrowList = borrowRecords.map(borrow => {
                const book = books.find(b => b.masach === borrow.masach);
                return {
                    maphieumuon: borrow.maphieumuon,
                    masinhvien: borrow.masinhvien,
                    masach: borrow.masach,
                    tensach: book ? book.tensach : 'Không tìm thấy',
                    ngaymuon: borrow.ngaymuon,
                    ngayhentra: borrow.ngayhentra,
                    ngaytra: borrow.ngaytra,
                    trangthai: borrow.trangthai,
                    giahan: borrow.giahan,
                };
            });

            return res.status(200).json({ message: 'Danh sách phiếu mượn', data: borrowList });
        } catch (error) {
            console.error("Lỗi khi tìm phiếu mượn:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async GetBorrowsByStudent(req, res) {
        try {
            // Lấy token từ cookie hoặc header
            const token = req.cookies?.Token || req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập lại!' });
            }

            // Kiểm tra JWT_SECRET
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Lỗi cấu hình server, thiếu JWT_SECRET!' });
            }

            // Giải mã token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
            }

            const masinhvien = decoded.masinhvien;
            const today = moment().startOf('day');

            // Truy vấn tất cả phiếu mượn theo masinhvien
            const borrowRecords = await ModelHandleBook.find({ masinhvien });
            if (!borrowRecords.length) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn nào!' });
            }

            const bookIds = borrowRecords.map(borrow => borrow.masach);
            const books = await ModelBook.find({ masach: { $in: bookIds } });

            const borrowList = borrowRecords.map(borrow => {
                const book = books.find(b => b.masach === borrow.masach);
                const ngayHentra = moment(borrow.ngayhentra, 'YYYY-MM-DD');

                let quahan = 0;
                if (ngayHentra.isValid() && ngayHentra.isBefore(today)) {
                    quahan = today.diff(ngayHentra, 'days');
                }

                return {
                    maphieumuon: borrow.maphieumuon,
                    masach: borrow.masach,
                    tensach: book ? book.tensach : 'Không tìm thấy',
                    ngaymuon: borrow.ngaymuon,
                    ngayhentra: borrow.ngayhentra,
                    ngaytra: borrow.ngaytra,
                    tinhtrang: borrow.tinhtrang,
                    giahan: borrow.giahan,
                    quahan: quahan > 0 ? quahan : undefined
                };
            });

            return res.status(200).json({ message: 'Danh sách phiếu mượn', data: borrowList });
        } catch (error) {
            console.error("Lỗi khi lấy phiếu mượn theo sinh viên:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau!' });
        }
    }

    async GetBorrowById(req, res) {
        try {
            const { maphieumuon } = req.body;

            if (!maphieumuon) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn !!!' });
            }

            const borrowRecord = await ModelHandleBook.findOne({ maphieumuon: maphieumuon.trim() });

            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn !!!' });
            }

            return res.status(200).json({ message: 'Tìm thấy phiếu mượn !!!', data: borrowRecord });
        } catch (error) {
            console.error("Lỗi khi tìm phiếu mượn:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    //async updateOverdueStatus(req, res) {
    //    try {
    //        const today = moment().format('YYYY-MM-DD');

    //        // Lấy danh sách sách quá hạn
    //        const overdueBooks = await ModelHandleBook.find({ ngayhentra: { $lt: today }, tinhtrang: false });

    //        if (overdueBooks.length === 0) {
    //            return res.status(200).json({ message: "Không có sách nào quá hạn." });
    //        }

    //        // Tạo danh sách cập nhật
    //        const bulkUpdates = overdueBooks.map(book => ({
    //            updateOne: {
    //                filter: { _id: book._id },
    //                update: { $set: { quahan: moment(today).diff(moment(book.ngayhentra, 'YYYY-MM-DD'), 'days') } }
    //            }
    //        }));

    //        // Cập nhật tất cả trong một lần gọi
    //        await ModelHandleBook.bulkWrite(bulkUpdates);

    //        console.log("Cập nhật trạng thái quá hạn thành công!");
    //        return res.status(200).json({ message: "Cập nhật trạng thái quá hạn thành công!" });

    //    } catch (error) {
    //        console.error("Lỗi cập nhật quá hạn:", error);
    //        return res.status(500).json({ error: "Lỗi cập nhật quá hạn", details: error.message });
    //    }
    //}

    async RequestBorrowBook(req, res) {
        try {
            const token = req.cookies.Token;
            if (!token) return res.status(401).json({ message: 'Không có token !!!' });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const masinhvien = decoded.masinhvien;

            // 🔹 Kiểm tra người dùng tồn tại không
            const user = await ModelUser.findOne({ masinhvien });
            const reader = await ModelReader.findOne({ masinhvien });

            if (!user || !reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng !!!' });
            }

            const { masach, quantity, mavitri, ngaymuon } = req.body;
            if (!masach || !quantity || !mavitri || !ngaymuon) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin !!!' });
            }

            // 🔹 Kiểm tra ngày mượn hợp lệ (phải từ hôm nay trở đi)
            const today = moment().startOf('day');
            const borrowDate = moment.utc(ngaymuon, 'YYYY-MM-DD');

            if (borrowDate.isBefore(today)) {
                return res.status(400).json({ message: 'Ngày mượn không hợp lệ !!!' });
            }

            // 🔹 Tìm sách theo `masach`
            const book = await ModelBook.findOne({ masach });
            if (!book) return res.status(404).json({ message: 'Không tìm thấy sách !!!' });

            // 🔹 Tìm vị trí sách cần mượn
            const vitriIndex = book.vitri.findIndex(v => v.mavitri === mavitri);
            if (vitriIndex === -1) return res.status(404).json({ message: 'Không tìm thấy vị trí sách !!!' });

            // 🔹 Kiểm tra số lượng sách khả dụng
            const availableBooks = book.vitri[vitriIndex].soluong - book.vitri[vitriIndex].soluongmuon;
            if (availableBooks < quantity) {
                return res.status(400).json({ message: 'Không đủ sách để mượn !!!' });
            }

            // 🔹 Kiểm tra số sách đã mượn
            const borrowedBooks = await ModelHandleBook.find({ masinhvien, tinhtrang: false });
            const totalBorrowed = borrowedBooks.reduce((sum, item) => sum + item.soluong, 0);
            const maxBooks = reader.typereader === 'Sinh viên' ? 6 : 9;

            if (totalBorrowed + quantity > maxBooks) {
                return res.status(400).json({ message: `Bạn chỉ được mượn tối đa ${maxBooks} quyển !!!` });
            }

            // 🔹 Xác định ngày hẹn trả
            const daysToAdd = reader.typereader === 'Sinh viên' ? 30 : 45;
            const ngayhentra = moment.utc(ngaymuon).add(daysToAdd, 'days').toDate();

            // 🔹 Tạo `maphieumuon`
            const lastHandle = await ModelHandleBook.findOne({}, { maphieumuon: 1 }) // Chỉ lấy `maphieumuon`
                .sort({ maphieumuon: -1 }) // Sắp xếp giảm dần để lấy số lớn nhất
                .lean();

            const newmaphieumuon = lastHandle && !isNaN(lastHandle.maphieumuon)
                ? (parseInt(lastHandle.maphieumuon, 10) + 1).toString() // Chuyển sang số, tăng 1, rồi về string
                : "1"; // Nếu chưa có user, bắt đầu từ "1"
            // 🔹 Lưu thông tin mượn vào `ModelHandleBook`
            const newBorrow = new ModelHandleBook({
                maphieumuon: newmaphieumuon,
                masinhvien,
                masach,
                mavitri,
                soluong: quantity,
                ngaymuon: borrowDate.toDate(),
                ngayhentra,
                tinhtrang: false,
                confirm: false
            });

            await newBorrow.save();

            // 🔹 Cập nhật số lượng mượn trong `book.vitri`
            book.vitri[vitriIndex].soluongmuon += quantity;
            await book.save();

            return res.status(200).json({ message: 'Mượn sách thành công !!!', data: newBorrow });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async ReturnBook(req, res) {
        try {
            const { maphieumuon, masach, ngaytra } = req.body;
            if (!maphieumuon || !masach || !ngaytra) {
                return res.status(400).json({ message: 'Vui lòng nhập mã phiếu mượn, mã sách và ngày trả !!!' });
            }

            // 🔹 Tìm phiếu mượn chưa trả
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon.trim(), // Cắt khoảng trắng
                masach: masach.trim(),
                tinhtrang: false
            });
            if (!borrowRecord) return res.status(404).json({ message: 'Không tìm thấy phiếu mượn chưa trả !!!' });

            // 🔹 Cập nhật trạng thái phiếu mượn
            borrowRecord.giahan = true;
            borrowRecord.tinhtrang = true;
            borrowRecord.ngaytra = moment(ngaytra, 'YYYY-MM-DD').format('YYYY-MM-DD');
            await borrowRecord.save();

            // 🔹 Tìm sách theo `masach`
            const book = await ModelBook.findOne({ masach });
            if (!book) return res.status(404).json({ message: 'Không tìm thấy sách !!!' });

            // 🔹 Xác định vị trí của sách đã mượn
            const vitriIndex = book.vitri.findIndex(v => v.mavitri === borrowRecord.mavitri);
            if (vitriIndex === -1) {
                return res.status(404).json({ message: 'Không tìm thấy vị trí sách !!!' });
            }

            // 🔹 Cập nhật số lượng sách tại đúng vị trí
            book.vitri[vitriIndex].soluongmuon -= borrowRecord.soluong;

            await book.save();

            return res.status(200).json({ message: 'Trả sách thành công !!!', data: borrowRecord });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async confirmBorrowRequest(req, res) {
        try {
            const { maphieumuon } = req.body;

            const borrowRequest = await ModelHandleBook.findOneAndUpdate(
                { maphieumuon: maphieumuon },
                { confirm: true },
                { new: true }
            );

            if (!borrowRequest) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu mượn sách !!!' });
            }

            return res.status(200).json({ message: 'Xác nhận thành công !!!', data: borrowRequest });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }


    async ExtendBorrowing(req, res) {
        try {
            const token = req.cookies.Token;
            if (!token) {
                return res.status(401).json({ message: 'Không có token !!!' });
            }
            if (!process.env.JWT_SECRET) {
                return res.status(500).json({ message: 'Lỗi cấu hình server !!!' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const masinhvien = decoded.masinhvien;
            const maphieumuon = req.body.maphieumuon?.trim(); // Xóa khoảng trắng

            if (!maphieumuon) {
                return res.status(400).json({ message: 'Vui lòng nhập ID phiếu mượn !!!' });
            }

            // 📌 Tìm thông tin người đọc (Sinh viên/Giáo viên)
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin người đọc !!!' });
            }

            // Xác định số ngày gia hạn dựa trên typereader
            let soNgayGiaHan = 0;
            if (reader.typereader === 'Sinh viên') {
                soNgayGiaHan = 10;
            } else if (reader.typereader === 'Giảng viên') {
                soNgayGiaHan = 15;
            } else {
                return res.status(400).json({ message: 'Loại người đọc không hợp lệ !!!' });
            }

            // 📌 Tìm phiếu mượn sách
            const borrowRecord = await ModelHandleBook.findOne({
                maphieumuon: maphieumuon,
                masinhvien,
                tinhtrang: false
            });

            if (!borrowRecord) {
                return res.status(404).json({ message: 'Không tìm thấy phiếu mượn hợp lệ !!!' });
            }

            // 📌 Kiểm tra nếu đã gia hạn rồi thì không cho gia hạn nữa
            if (borrowRecord.giahan) {
                return res.status(400).json({ message: 'Bạn chỉ được gia hạn sách một lần !!!' });
            }

            const ngayHenTra = moment(borrowRecord.ngayhentra, 'YYYY-MM-DD');
            const today = moment().startOf('day');

            // 📌 Kiểm tra nếu đã quá hạn thì không thể gia hạn
            if (ngayHenTra.isBefore(today)) {
                return res.status(400).json({ message: 'Không thể gia hạn vì sách đã quá hạn !!!' });
            }

            // 📌 Gia hạn thêm số ngày phù hợp
            const newDueDate = ngayHenTra.add(soNgayGiaHan, 'days').format('YYYY-MM-DD');
            borrowRecord.ngayhentra = newDueDate;
            borrowRecord.giahan = true; // Đánh dấu đã gia hạn
            await borrowRecord.save();

            return res.status(200).json({
                message: `Gia hạn sách thành công !!! (${soNgayGiaHan} ngày)`,
                newDueDate
            });

        } catch (error) {
            console.error("Lỗi khi gia hạn sách:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async cancelUnconfirmedBorrows(req, res) {
        try {
            const fiveDaysAgo = moment().subtract(5, 'days').toDate();

            // 📌 Tìm các yêu cầu mượn chưa được xác nhận quá 5 ngày
            const expiredRequests = await ModelHandleBook.find({
                confirm: false,
                ngaymuon: { $lte: fiveDaysAgo },
            });

            for (const request of expiredRequests) {
                // 📌 Cập nhật lại số lượng sách
                await ModelBook.findOneAndUpdate(
                    { masach: request.masach },
                    { $inc: { soluongmuon: -request.soluong } }
                );

                // 📌 Xóa yêu cầu mượn sách
                await ModelHandleBook.deleteOne({ _id: request._id });

                console.log(`Đã hủy yêu cầu mượn sách có ID: ${request._id}`);
            }

            return res.json({ success: true, message: 'Kiểm tra và hủy yêu cầu mượn sách thành công!' });
        } catch (error) {
            console.error('Lỗi khi kiểm tra yêu cầu mượn sách:', error);
            return res.status(500).json({ success: false, message: 'Có lỗi xảy ra!' });
        }
    }
    async GetBorrowedBooks(req, res) {
        try {
            const today = moment().startOf('day');

            // 📌 Lấy tất cả phiếu mượn (không xét tình trạng)
            let borrowRecords = await ModelHandleBook.find();

            // 📌 Lấy danh sách mã sách từ các phiếu mượn
            const bookIds = borrowRecords.map(record => record.masach);

            // 📌 Truy vấn sách theo `masach`
            const books = await ModelBook.find({ masach: { $in: bookIds } });

            // 📌 Ghép thông tin tên sách vào từng phiếu mượn
            const result = borrowRecords.map(record => {
                const book = books.find(b => b.masach === record.masach); // Tìm sách theo mã sách
                const ngayHenTra = moment(record.ngayhentra, 'YYYY-MM-DD');
                let overdueDays = 0;

                if (ngayHenTra.isValid() && ngayHenTra.isBefore(today)) {
                    overdueDays = today.diff(ngayHenTra, 'days');
                }

                return {
                    ...record.toObject(), // Chuyển mongoose document thành object
                    tensach: book ? book.tensach : 'Không tìm thấy', // Lấy tên sách hoặc hiển thị lỗi
                    quahan: overdueDays > 0 ? overdueDays : undefined // Chỉ hiển thị nếu có quá hạn
                };
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách phiếu mượn:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }


}

module.exports = new ControllerHandleBook();
