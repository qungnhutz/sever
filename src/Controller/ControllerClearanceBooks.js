const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const ModelClearanceBooks = require("../Model/ModelClearanceBooks");
const ModelLocationCategory = require("../Model/ModelLocationCategory");
const ModelBook = require("../Model/ModelBook");

class ControllerClearanceBooks {
    async getAllClearanceBooks(req, res) {
        try {
            const clearanceBooks = await ModelClearanceBooks.find().lean();

            if (clearanceBooks.length === 0) {
                return res.status(404).json({ message: "Không có sách thanh lý nào!" });
            }
            const locations = await ModelLocationCategory.find({}, "mavitri coso").lean();
            const locationMap = {};
            locations.forEach(loc => {
                locationMap[loc.mavitri] = loc.coso;
            });
            const formattedClearanceBooks = clearanceBooks.map(book => ({
                ...book,
                coso: locationMap[book.mavitri] || "Không xác định"
            }));

            return res.status(200).json({ message: "Lấy danh sách thành công!", clearanceBooks: formattedClearanceBooks });
        } catch (error) {
            console.error("❌ Lỗi khi lấy danh sách sách thanh lý:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    async addClearanceBook(req, res) {
        try {
            const { masachthanhly, masach, soluong, mavitri, lydo, trangthai = false } = req.body; // Mặc định trạng thái là false
            if (!masachthanhly || !masach || !soluong || !mavitri || !lydo) {
                return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
            }

            // Kiểm tra mã sách thanh lý có trùng không
            const existingClearanceBookById = await ModelClearanceBooks.findOne({ masachthanhly });
            if (existingClearanceBookById) {
                return res.status(400).json({ message: "Mã sách thanh lý đã tồn tại!" });
            }

            // Kiểm tra mã sách đã tồn tại trong danh sách thanh lý chưa
            const existingClearanceBook = await ModelClearanceBooks.findOne({ masach, mavitri });
            if (existingClearanceBook) {
                if (existingClearanceBook.trangthai === false) {
                    return res.status(400).json({ message: "Sách này đã có trong danh sách thanh lý với trạng thái chưa xử lý, không thể thêm!" });
                }
                // Nếu trạng thái là true, cho phép thêm (coi như bản ghi mới)
            }

            // Kiểm tra vị trí có tồn tại không
            const existingLocationCategory = await ModelLocationCategory.findOne({ mavitri });
            if (!existingLocationCategory) {
                return res.status(400).json({ message: "Mã vị trí không tồn tại!" });
            }

            // Kiểm tra sách có tồn tại không
            const existingBook = await ModelBook.findOne({ masach });
            if (!existingBook) {
                return res.status(400).json({ message: "Mã sách không tồn tại trong danh sách sách!" });
            }

            // Kiểm tra sách có thuộc vị trí này không
            const bookLocation = existingBook.vitri.find(vt => vt.mavitri === mavitri);
            if (!bookLocation) {
                return res.status(400).json({ message: "Sách này không thuộc vị trí đã chọn!" });
            }

            // Kiểm tra số lượng có hợp lệ không
            if (soluong > bookLocation.soluong) {
                return res.status(400).json({ message: "Số lượng thanh lý vượt quá số lượng sách tại vị trí này!" });
            }

            // Lưu sách thanh lý
            const newClearanceBook = new ModelClearanceBooks({
                masachthanhly,
                masach,
                soluong,
                mavitri,
                lydo,
                trangthai, // Mặc định false từ req.body hoặc logic frontend
                lastTrangthai: trangthai // Ban đầu lastTrangthai khớp với trangthai
            });
            await newClearanceBook.save();

            return res.status(201).json({ message: "Thêm sách thanh lý thành công!", clearanceBook: newClearanceBook });
        } catch (error) {
            console.error("❌ Lỗi khi thêm sách thanh lý:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }
    async editClearanceBook(req, res) {
        try {
            const { masachthanhly, masach, soluong, mavitri, lydo } = req.body;
            if (!masachthanhly) {
                return res.status(400).json({ message: "Thiếu mã sách thanh lý!" });
            }

            // Kiểm tra trạng thái hiện tại của sách
            const currentBook = await ModelClearanceBooks.findOne({ masachthanhly });
            if (!currentBook) {
                return res.status(404).json({ message: "Không tìm thấy sách thanh lý!" });
            }
            if (currentBook.trangthai === true) {
                return res.status(403).json({ message: "Sách đã được thanh lý (trạng thái true), không thể chỉnh sửa!" });
            }

            // Tạo object chứa dữ liệu cập nhật, luôn bao gồm ngày cập nhật
            let updateData = { ngaycapnhat: Date.now() };

            // Xử lý các trường cần cập nhật
            if (masach !== undefined || soluong !== undefined || mavitri) {
                // Xác định masach và mavitri để kiểm tra
                const checkMasach = masach !== undefined ? masach : currentBook.masach;
                const checkMavitri = mavitri || currentBook.mavitri;

                // Kiểm tra sách và vị trí
                const existingBook = await ModelBook.findOne({ masach: checkMasach });
                if (!existingBook) {
                    return res.status(400).json({ message: "Mã sách không tồn tại trong danh sách sách!" });
                }

                const bookLocation = existingBook.vitri.find(vt => vt.mavitri === checkMavitri);
                if (!bookLocation) {
                    return res.status(400).json({ message: `Sách ${checkMasach} không thuộc vị trí ${checkMavitri}!` });
                }

                // Kiểm tra số lượng nếu có thay đổi
                const newSoluong = soluong !== undefined ? soluong : currentBook.soluong;
                if (newSoluong > bookLocation.soluong) {
                    return res.status(400).json({ message: "Số lượng thanh lý vượt quá số lượng sách tại vị trí này!" });
                }

                // Cập nhật các trường nếu có
                if (masach !== undefined) updateData.masach = masach;
                if (soluong !== undefined) updateData.soluong = soluong;
                if (mavitri) updateData.mavitri = mavitri;
            }

            if (lydo) updateData.lydo = lydo;

            // Cập nhật dữ liệu
            const updatedBook = await ModelClearanceBooks.findOneAndUpdate(
                { masachthanhly },
                { $set: updateData },
                { new: true } // Trả về dữ liệu mới sau khi cập nhật
            );

            return res.status(200).json({ message: "Cập nhật thành công!", clearanceBook: updatedBook });
        } catch (error) {
            console.error("❌ Lỗi khi cập nhật sách thanh lý:", error.message, error.stack);
            return res.status(500).json({ message: "Lỗi máy chủ khi cập nhật sách thanh lý!", error: error.message });
        }
    }
    async deleteClearanceBook(req, res) {
        try {
            const { masachthanhly } = req.query;
            if (!masachthanhly) {
                return res.status(400).json({ message: "Thiếu mã sách thanh lý!" });
            }

            const result = await ModelClearanceBooks.deleteOne({ masachthanhly });
            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Không tìm thấy sách thanh lý!" });
            }

            return res.status(200).json({ message: "Xóa thành công!" });
        } catch (error) {
            console.error("❌ Lỗi khi xóa sách thanh lý:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }


    async exportClearanceBooks(req, res) {
        try {
            // Lấy tháng và năm từ query parameters (ví dụ: ?month=4&year=2025)
            const { month, year } = req.query;

            // Kiểm tra tháng và năm
            if (!month || !year) {
                return res.status(400).json({ message: "Thiếu thông tin tháng hoặc năm!" });
            }

            const monthNum = parseInt(month, 10);
            const yearNum = parseInt(year, 10);

            // Kiểm tra tháng (1-12) và năm (1900-9999)
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return res.status(400).json({ message: "Tháng không hợp lệ! Vui lòng nhập từ 1 đến 12." });
            }
            if (isNaN(yearNum) || yearNum < 1900 || yearNum > 9999) {
                return res.status(400).json({ message: "Năm không hợp lệ!" });
            }

            // Tạo khoảng thời gian cho tháng được chọn
            const startDate = new Date(yearNum, monthNum - 1, 1); // Ngày đầu tiên của tháng
            const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // Ngày cuối cùng của tháng

            // Lấy danh sách sách thanh lý trong khoảng thời gian
            const clearanceBooks = await ModelClearanceBooks.find({
                ngaycapnhat: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).lean();

            if (!clearanceBooks || clearanceBooks.length === 0) {
                return res.status(404).json({ message: `Không có dữ liệu để xuất cho tháng ${monthNum}/${yearNum}!` });
            }

            // Chuyển đổi dữ liệu để xuất ra Excel
            const data = clearanceBooks.map(book => ({
                "Mã Sách Thanh Lý": book.masachthanhly,
                "Mã Sách": book.masach,
                "Số Lượng": book.soluong,
                "Mã Vị Trí": book.mavitri,
                "Lý Do": book.lydo,
                "Trạng Thái": book.trangthai ? "Đã thanh lý" : "Chưa thanh lý",
                "Ngày Cập Nhật": book.ngaycapnhat ? new Date(book.ngaycapnhat).toLocaleDateString("vi-VN") : "N/A"
            }));

            // Ghi log dữ liệu để kiểm tra
            console.log(`Dữ liệu sẽ được xuất ra Excel cho ${monthNum}/${yearNum}:`, data);

            // Tạo workbook và worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, `Thanh Lý ${monthNum}-${yearNum}`);

            // Tạo buffer của file Excel trong bộ nhớ
            const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

            // Đặt tên file
            const fileName = `danhsach_thanhly_${monthNum}_${yearNum}.xlsx`;

            // Thiết lập header để client nhận file
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Length', buffer.length);

            // Gửi buffer trực tiếp về client
            return res.send(buffer);
        } catch (error) {
            console.error("❌ Lỗi khi xuất Excel:", error.message, error.stack);
            return res.status(500).json({ message: error.message || "Lỗi máy chủ!", error: error.message });
        }
    }

    async changeClearanceBookStatus(req, res) {
        try {
            const { masachthanhly, trangthai } = req.body;

            // Kiểm tra thông tin đầu vào
            if (!masachthanhly || trangthai === undefined) {
                return res.status(400).json({ message: "Thiếu mã sách thanh lý hoặc trạng thái!" });
            }

            if (typeof trangthai !== 'boolean') {
                return res.status(400).json({ message: "Trạng thái phải là giá trị boolean (true/false)!" });
            }

            // Tìm sách thanh lý
            const clearanceBook = await ModelClearanceBooks.findOne({ masachthanhly });
            if (!clearanceBook) {
                return res.status(404).json({ message: "Không tìm thấy sách thanh lý!" });
            }

            // Kiểm tra nếu trạng thái hiện tại đã là true thì không cho thay đổi
            if (clearanceBook.trangthai === true) {
                return res.status(403).json({ message: "Sách đã được thanh lý (trạng thái true), không thể thay đổi trạng thái!" });
            }

            // Chỉ xử lý khi thay đổi từ false sang true
            if (trangthai === true && clearanceBook.trangthai === false) {
                // Tìm sách trong ModelBook
                const book = await ModelBook.findOne({ masach: clearanceBook.masach });
                if (!book) {
                    return res.status(400).json({ message: `Không tìm thấy sách với mã ${clearanceBook.masach} trong ModelBook!` });
                }

                // Tìm vị trí trong sách
                const bookLocation = book.vitri.find(vt => vt.mavitri === clearanceBook.mavitri);
                if (!bookLocation) {
                    return res.status(400).json({ message: `Sách ${clearanceBook.masach} không thuộc vị trí ${clearanceBook.mavitri}!` });
                }

                // Kiểm tra số lượng trước khi giảm
                if (bookLocation.soluong < clearanceBook.soluong) {
                    return res.status(400).json({ message: `Số lượng sách tại vị trí ${clearanceBook.mavitri} không đủ để thanh lý (${bookLocation.soluong} < ${clearanceBook.soluong})!` });
                }

                // Giảm số lượng sách
                bookLocation.soluong -= clearanceBook.soluong;
                await book.save();
            }

            // Cập nhật trạng thái và ngày cập nhật
            clearanceBook.trangthai = trangthai;
            clearanceBook.ngaycapnhat = Date.now();
            await clearanceBook.save();

            return res.status(200).json({
                message: "Thay đổi trạng thái và cập nhật số lượng thành công!",
                clearanceBook: clearanceBook
            });
        } catch (error) {
            console.error("❌ Lỗi khi thay đổi trạng thái sách thanh lý:", error.message, error.stack);
            return res.status(500).json({ message: "Lỗi máy chủ khi thay đổi trạng thái!", error: error.message });
        }
    }
}

module.exports = new ControllerClearanceBooks();