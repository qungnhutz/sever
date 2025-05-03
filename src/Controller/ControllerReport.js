const XLSX = require("xlsx");
const moment = require('moment');
const BorrowingForm = require("../Model/ModelHandleBook");
const ModelBook = require("../Model/ModelBook");
const LocationCategory = require("../Model/ModelLocationCategory");

class ControllerReport {
    // 📌 API hiển thị danh sách thống kê số lượt mượn sách
    async getBookBorrowByMonth(req, res) {
        try {
            const { month, year } = req.query;

            if (!month || !year) {
                return res.status(400).json({ message: "Vui lòng nhập tháng và năm!" });
            }

            const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
            const endDate = moment(`${year}-${month}-01`).endOf('month').toDate();

            const borrowStats = await BorrowingForm.aggregate([
                {
                    $match: {
                        ngaymuon: { $gte: startDate, $lte: endDate }
                    }
                },
                { $unwind: "$books" }, // Tách mảng books thành các bản ghi riêng
                {
                    $group: {
                        _id: {
                            masach: "$books.masach",
                            mavitri: "$books.mavitri"
                        },
                        totalBorrowed: { $sum: "$books.soluong" }
                    }
                },
                {
                    $lookup: {
                        from: "books",
                        localField: "_id.masach",
                        foreignField: "masach",
                        as: "bookInfo"
                    }
                },
                { $unwind: "$bookInfo" },
                {
                    $lookup: {
                        from: "locationcategories",
                        localField: "_id.mavitri",
                        foreignField: "mavitri",
                        as: "locationInfo"
                    }
                },
                { $unwind: "$locationInfo" },
                {
                    $project: {
                        _id: 0,
                        masach: "$_id.masach",
                        tensach: "$bookInfo.tensach",
                        mavitri: "$_id.mavitri",
                        coso: "$locationInfo.coso",
                        soke: "$locationInfo.soke",
                        tongluotmuon: "$totalBorrowed"
                    }
                },
                { $sort: { tongluotmuon: -1 } }
            ]);

            return res.status(200).json({
                message: `Thống kê lượt mượn sách theo vị trí tháng ${month}/${year}`,
                data: borrowStats
            });
        } catch (error) {
            console.error("Lỗi khi lấy thống kê sách:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Hàm xuất thống kê sách ra file Excel
    async exportBookBorrow(req, res) {
        try {
            const { month, year } = req.query;
            if (!month || !year) {
                return res.status(400).json({ message: "Vui lòng nhập tháng và năm!" });
            }

            const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
            const endDate = moment(`${year}-${month}-01`).endOf('month').toDate();

            const borrowStats = await BorrowingForm.aggregate([
                {
                    $match: {
                        ngaymuon: { $gte: startDate, $lte: endDate }
                    }
                },
                { $unwind: "$books" },
                {
                    $group: {
                        _id: {
                            masach: "$books.masach",
                            mavitri: "$books.mavitri"
                        },
                        totalBorrowed: { $sum: "$books.soluong" }
                    }
                },
                {
                    $lookup: {
                        from: "books",
                        localField: "_id.masach",
                        foreignField: "masach",
                        as: "bookInfo"
                    }
                },
                { $unwind: "$bookInfo" },
                {
                    $lookup: {
                        from: "locationcategories",
                        localField: "_id.mavitri",
                        foreignField: "mavitri",
                        as: "locationInfo"
                    }
                },
                { $unwind: "$locationInfo" },
                {
                    $project: {
                        _id: 0,
                        masach: "$_id.masach",
                        tensach: "$bookInfo.tensach",
                        mavitri: "$_id.mavitri",
                        coso: "$locationInfo.coso",
                        soke: "$locationInfo.soke",
                        tongluotmuon: "$totalBorrowed"
                    }
                },
                { $sort: { tongluotmuon: -1 } }
            ]);

            if (borrowStats.length === 0) {
                return res.status(404).json({ message: "Không có dữ liệu sách trong tháng này." });
            }

            const data = borrowStats.map(item => ({
                "Mã sách": item.masach,
                "Tên sách": item.tensach,
                "Mã vị trí": item.mavitri,
                "Cơ sở": item.coso,
                "Số kệ": item.soke,
                "Tổng lượt mượn": item.tongluotmuon
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet([]);

            XLSX.utils.sheet_add_aoa(ws, [[`BÁO CÁO SÁCH THÁNG ${month}/${year}`]], { origin: "A1" });
            XLSX.utils.sheet_add_json(ws, data, { origin: "A3", skipHeader: false });

            ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

            XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");

            const fileName = `Bao_cao_sach_${month}_${year}.xlsx`;
            const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            return res.send(buffer);
        } catch (error) {
            console.error("Lỗi khi xuất Excel:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }
}

module.exports = new ControllerReport();