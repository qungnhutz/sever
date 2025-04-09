const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const ModelBook = require("../Model/ModelBook");
const LocationCategory = require("../Model/ModelLocationCategory");

class ControllerReport {
    // Lấy danh sách sách tồn kho theo từng vị trí
    async GetBooksInStock(req, res) {
        try {
            const books = await ModelBook.find({});

            // Định dạng lại dữ liệu
            const formattedBooks = books.map(book => {
                const vitriFormatted = book.vitri.map(v => ({
                    mavitri: v.mavitri,
                    soluong: v.soluong,
                    soluong_con: v.soluong - v.soluongmuon // Số lượng còn lại
                }));

                return {
                    masach: book.masach,
                    tensach: book.tensach,
                    vitri: vitriFormatted,
                };
            });

            return res.status(200).json(formattedBooks);
        } catch (error) {
            console.error("Lỗi khi lấy sách tồn kho:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    // 📌 API xuất danh sách sách còn tồn kho ra file Excel
    async exportBooksInStock(req, res) {
        try {
            const booksInStock = await ModelBook.aggregate([
                { $unwind: "$vitri" },
                {
                    $lookup: {
                        from: "locationcategories",
                        localField: "vitri.mavitri",
                        foreignField: "mavitri",
                        as: "locationInfo"
                    }
                },
                { $unwind: "$locationInfo" },
                {
                    $project: {
                        _id: 0,
                        masach: 1,
                        tensach: 1,
                        mavitri: "$vitri.mavitri",
                        coso: "$locationInfo.coso",
                        soke: "$locationInfo.soke",
                        soluong: "$vitri.soluong",
                        soluong_con: { $subtract: ["$vitri.soluong", "$vitri.soluongmuon"] }
                    }
                },
                { $sort: { tensach: 1 } }
            ]);

            if (booksInStock.length === 0) {
                return res.status(404).json({ message: "Không có sách nào trong kho." });
            }

            const data = booksInStock.map(item => ({
                "Mã sách": item.masach,
                "Tên sách": item.tensach,
                "Mã vị trí": item.mavitri,
                "Cơ sở": item.coso,
                "Số kệ": item.soke,
                "Số lượng tổng": item.soluong,
                "Số lượng còn lại": item.soluong_con
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet([]);

            // Thêm tiêu đề và dữ liệu
            XLSX.utils.sheet_add_aoa(ws, [["DANH SÁCH SÁCH CÒN TRONG KHO"]], { origin: "A1" });
            XLSX.utils.sheet_add_json(ws, data, { origin: "A3", skipHeader: false });

            // Định dạng cột
            ws["!cols"] = [
                { wch: 15 }, // Mã sách
                { wch: 30 }, // Tên sách
                { wch: 15 }, // Mã vị trí
                { wch: 15 }, // Cơ sở
                { wch: 10 }, // Số kệ
                { wch: 15 }, // Số lượng tổng
                { wch: 15 }  // Số lượng còn lại
            ];

            XLSX.utils.book_append_sheet(wb, ws, "Books In Stock");

            // Tạo buffer thay vì lưu file
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            // Thiết lập header để gửi file
            res.setHeader('Content-Disposition', 'attachment; filename="Books_In_Stock.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

            // Gửi buffer trực tiếp
            return res.send(buffer);

        } catch (error) {
            console.error("Lỗi khi xuất Excel:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }
}

module.exports = new ControllerReport();
