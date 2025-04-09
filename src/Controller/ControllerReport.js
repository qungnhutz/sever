const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const BorrowingForm = require("../Model/ModelHandleBook");
const ModelBook = require("../Model/ModelBook");
const LocationCategory = require("../Model/ModelLocationCategory");
const moment = require('moment');

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

            const bookStats = await ModelBook.aggregate([
                { $unwind: "$vitri" }, // Mỗi sách có nhiều vị trí
                {
                    $lookup: {
                        from: "borrowingforms",
                        let: { bookId: "$masach", locationId: "$vitri.mavitri" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$masach", "$$bookId"] },
                                            { $eq: ["$mavitri", "$$locationId"] },
                                            { $gte: ["$ngaymuon", startDate] },
                                            { $lte: ["$ngaymuon", endDate] }
                                        ]
                                    }
                                }
                            },
                            { $group: { _id: null, totalBorrowed: { $sum: "$soluong" } } }
                        ],
                        as: "borrowRecords"
                    }
                },
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
                        tongluotmuon: {
                            $ifNull: [{ $arrayElemAt: ["$borrowRecords.totalBorrowed", 0] }, 0]
                        }
                    }
                },
                { $sort: { tongluotmuon: -1 } }
            ]);

            return res.status(200).json({
                message: `Thống kê lượt mượn sách theo vị trí tháng ${month}/${year}`,
                data: bookStats
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

            const bookStats = await ModelBook.aggregate([
                { $unwind: "$vitri" },
                {
                    $lookup: {
                        from: "borrowingforms",
                        let: { bookId: "$masach", locationId: "$vitri.mavitri" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$masach", "$$bookId"] },
                                            { $eq: ["$mavitri", "$$locationId"] },
                                            { $gte: ["$ngaymuon", startDate] },
                                            { $lte: ["$ngaymuon", endDate] }
                                        ]
                                    }
                                }
                            },
                            { $group: { _id: null, totalBorrowed: { $sum: "$soluong" } } }
                        ],
                        as: "borrowRecords"
                    }
                },
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
                        tongluotmuon: {
                            $ifNull: [{ $arrayElemAt: ["$borrowRecords.totalBorrowed", 0] }, 0]
                        }
                    }
                },
                { $sort: { tongluotmuon: -1 } }
            ]);

            if (bookStats.length === 0) {
                return res.status(404).json({ message: "Không có dữ liệu sách trong tháng này." });
            }

            const data = bookStats.map(item => ({
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

            // Tạo buffer thay vì ghi file
            const fileName = `Bao_cao_sach_${month}_${year}.xlsx`;
            const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

            // Thiết lập header để client tải file
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

            // Gửi buffer trực tiếp
            return res.send(buffer);

        } catch (error) {
            console.error("Lỗi khi xuất Excel:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

}

module.exports = new ControllerReport();
