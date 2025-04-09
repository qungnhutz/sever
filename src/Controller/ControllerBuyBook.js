const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const ModelBuyBook = require("../Model/ModelBuyBook");
const LocationCategory = require('../Model/ModelLocationCategory');
const ModelBook = require('../Model/ModelBook');
class ControllerBuyBook {
    async addBuyBook(req, res) {
        try {
            const { maphieumua, masach, soluong, dongia, mavitri } = req.body;
            if (!maphieumua || !masach || !soluong || !dongia || !mavitri) {
                return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
            }
            const existingBuyBook1 = await ModelBuyBook.findOne({ maphieumua });
            if (existingBuyBook1) {
                return res.status(400).json({ message: "Trùng mã mua" });
            }
            // Kiểm tra nếu sách đã có trong danh sách mua với mã vị trí đó
            const existingBuyBook = await ModelBuyBook.findOne({ masach, mavitri });
            if (existingBuyBook) {
                return res.status(400).json({ message: "Sách này đã có trong danh sách mua tại vị trí này!" });
            }
            const existingBuyBook2 = await ModelBook.findOne({ masach });
            if (!existingBuyBook2) {
                return res.status(400).json({ message: "Chưa có thông tin mã sách này trong danh sách sách" });
            }
            const existingBuyBook3 = await LocationCategory.findOne({ mavitri });
            if (!existingBuyBook3) {
                return res.status(400).json({ message: "Mã vị trí không hợp lệ" });
            }

            // Kiểm tra mã vị trí có hợp lệ không
            const location = await LocationCategory.findOne({ mavitri });
            if (!location) {
                return res.status(400).json({ message: "Mã vị trí không tồn tại!" });
            }

            const thanhtien = soluong * dongia; // Tính thành tiền

            const newBuyBook = new ModelBuyBook({ maphieumua, masach, soluong, dongia, thanhtien, mavitri });
            await newBuyBook.save();
            return res.status(201).json({ message: "Thêm sách cần mua thành công!", buyBook: newBuyBook });
        } catch (error) {
            console.error("❌ Lỗi khi thêm sách cần mua:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }


    // 📌 Sửa thông tin sách theo maphieumua
    async editBuyBook(req, res) {
        try {
            const { maphieumua,masach, soluong, dongia, mavitri } = req.body;
            if (!maphieumua) {
                return res.status(400).json({ message: "Thiếu mã phiếu mua!" });
            }

            const buyBooks = await ModelBuyBook.find({ maphieumua });
            if (buyBooks.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy sách cần mua với mã phiếu mua này!" });
            }
            const existingBuyBook = await ModelBuyBook.findOne({ masach, mavitri });
            if (existingBuyBook) {
                return res.status(400).json({ message: "Sách này đã có trong danh sách mua tại vị trí này!" });
            }
            const existingBuyBook2 = await ModelBook.findOne({ masach });
            if (!existingBuyBook2) {
                return res.status(400).json({ message: "Chưa có thông tin mã sách này trong danh sách sách" });
            }
            const existingBuyBook3 = await LocationCategory.findOne({ mavitri });
            if (!existingBuyBook3) {
                return res.status(400).json({ message: "Mã vị trí không hợp lệ" });
            }

            // Cập nhật số lượng, đơn giá, thành tiền, và mã vị trí
            const updatedBooks = await Promise.all(
                buyBooks.map(async (book) => {
                    if (soluong) book.soluong = soluong;
                    if (dongia) book.dongia = dongia;
                    if (masach) book.masach = masach;
                    if (mavitri) book.mavitri = mavitri; // Cập nhật mã vị trí nếu có
                    book.thanhtien = book.soluong * book.dongia;
                    return book.save();
                })
            );

            return res.status(200).json({ message: `Cập nhật thành công ${updatedBooks.length} sách!`, buyBooks: updatedBooks });
        } catch (error) {
            console.error("❌ Lỗi khi cập nhật sách cần mua:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Xóa các sách cần mua theo maphieumua
    async deleteBuyBook(req, res) {
        try {
            const { maphieumua } = req.query;
            if (!maphieumua) {
                return res.status(400).json({ message: "Thiếu mã phiếu mua!" });
            }

            const result = await ModelBuyBook.deleteMany({ maphieumua });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Không tìm thấy sách cần mua với mã phiếu mua này!" });
            }

            return res.status(200).json({ message: `Xóa thành công ${result.deletedCount} phiếu mua!` });
        } catch (error) {
            console.error("❌ Lỗi khi xóa sách cần mua:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Xóa toàn bộ danh sách sách cần mua
    async deleteAllBuyBooks(req, res) {
        try {
            await ModelBuyBook.deleteMany({});
            return res.status(200).json({ message: "Xóa toàn bộ danh sách sách cần mua thành công!" });
        } catch (error) {
            console.error("❌ Lỗi khi xóa danh sách sách cần mua:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }
    async suggestBooksToBuy(req, res) {
        try {
            // Lấy danh sách sách và thông tin liên quan
            const books = await ModelBook.find().lean();
            const buyBooks = await ModelBuyBook.find().lean();
            const locations = await LocationCategory.find({}, "mavitri coso").lean();

            // Tạo map để ánh xạ mã vị trí với cơ sở
            const locationMap = {};
            locations.forEach(loc => {
                locationMap[loc.mavitri] = loc.coso;
            });

            // Tạo danh sách gợi ý sách cần mua
            const suggestedBooks = [];

            // Duyệt qua từng sách
            for (const book of books) {
                // Duyệt qua từng vị trí của sách
                for (const vitri of book.vitri) {
                    const remaining = vitri.soluong - vitri.soluongmuon;

                    // Nếu số lượng còn lại tại vị trí này bằng 0
                    if (remaining === 0) {
                        // Kiểm tra xem sách đã có trong danh sách mua tại vị trí này chưa
                        const existingBuyBook = buyBooks.find(buyBook =>
                            String(buyBook.masach) === String(book.masach) &&
                            String(buyBook.mavitri) === String(vitri.mavitri)
                        );

                        let isSuggested = false;

                        // Nếu chưa có trong danh sách mua, thêm vào
                        if (!existingBuyBook) {
                            isSuggested = true;
                            const newBuyBook = new ModelBuyBook({
                                maphieumua: `PM${Date.now()}`,
                                masach: book.masach,
                                soluong: 1, // Số lượng mặc định khi gợi ý
                                dongia: book.price || 0,
                                thanhtien: book.price || 0,
                                mavitri: vitri.mavitri
                            });
                            await newBuyBook.save();
                        }

                        // Thêm vào danh sách gợi ý
                        suggestedBooks.push({
                            masach: book.masach,
                            tensach: book.tensach,
                            soluongton: remaining, // Số lượng còn lại tại vị trí
                            mavitri: vitri.mavitri,
                            coso: locationMap[vitri.mavitri] || "Không xác định",
                            dongia: book.price || 0,
                            isSuggested: isSuggested
                        });
                    }
                }
            }

            // Nếu không có sách nào cần mua, trả về thông báo
            if (suggestedBooks.length === 0) {
                return res.status(200).json({ message: "Không có sách nào cần mua (số lượng còn lại = 0)." });
            }

            // Lọc các sách đã được gợi ý (isSuggested = true)
            const filteredSuggestions = suggestedBooks.filter(book => book.isSuggested);

            // Nếu không có sách nào được gợi ý, trả về thông báo
            if (filteredSuggestions.length === 0) {
                return res.status(200).json({ message: "Tất cả sách có số lượng còn lại = 0 đã được thêm vào danh sách mua." });
            }

            return res.status(200).json({
                message: "Danh sách sách cần mua gợi ý",
                suggestedBooks: filteredSuggestions
            });
        } catch (error) {
            console.error("❌ Lỗi khi gợi ý sách cần mua:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Lấy toàn bộ danh sách sách cần mua kèm thông tin vị trí
    async getAllBuyBooks(req, res) {
        try {
            const buyBooks = await ModelBuyBook.find().lean();

            // Lấy danh sách vị trí để ghép dữ liệu
            const locations = await LocationCategory.find({}, "mavitri coso").lean();
            const locationMap = {};
            locations.forEach(loc => {
                locationMap[loc.mavitri] = loc.coso;
            });

            // Ghép thông tin cơ sở vào danh sách mua sách
            const result = buyBooks.map(book => ({
                ...book,
                coso: locationMap[book.mavitri] || "Không xác định"
            }));

            return res.status(200).json({ message: "Lấy danh sách thành công!", buyBooks: result });
        } catch (error) {
            console.error("❌ Lỗi khi lấy danh sách sách cần mua:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Xuất danh sách mua sách ra file Excel
    async exportBuyBook(req, res) {
        try {
            const buyBooks = await ModelBuyBook.find().lean();
            if (buyBooks.length === 0) {
                return res.status(404).json({ message: "Không có dữ liệu để xuất!" });
            }

            // Lấy danh sách vị trí để ghép dữ liệu
            const locations = await LocationCategory.find({}, "mavitri coso").lean();
            const locationMap = {};
            locations.forEach(loc => {
                locationMap[loc.mavitri] = loc.coso;
            });

            // Chuyển đổi dữ liệu sang dạng xuất file
            const data = buyBooks.map(book => ({
                "Mã Phiếu Mua": book.maphieumua,
                "Mã Sách": book.masach,
                "Số Lượng": book.soluong,
                "Đơn Giá": book.dongia,
                "Thành Tiền": book.thanhtien,
                "Mã Vị Trí": book.mavitri,
                "Cơ Sở": locationMap[book.mavitri] || "Không xác định"
            }));

            // Tạo workbook và worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Danh Sách Mua Sách");

            // Tạo buffer thay vì lưu file
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // Thiết lập header để gửi file
            res.setHeader('Content-Disposition', 'attachment; filename="danhsach_muasach.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            // Gửi buffer trực tiếp
            return res.send(buffer);

        } catch (error) {
            console.error("❌ Lỗi khi xuất Excel:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }
}

module.exports = new ControllerBuyBook();
