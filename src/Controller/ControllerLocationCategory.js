const LocationCategory = require('../Model/ModelLocationCategory');
const ModelBook = require('../Model/ModelBook');
const QRCode = require('qrcode');
const ModelBookGenre = require('../Model/ModelBookGenre');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ControllerLocationCategory {

    constructor() {
        this.localIPv4 = this.getLocalIPv4();
    }

    getLocalIPv4() {
        const interfaces = os.networkInterfaces();
        for (const interfaceName in interfaces) {
            for (const iface of interfaces[interfaceName]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return "127.0.0.1";
    }

    async generateQRCodePerShelf(req, res) {
        try {
            const localIPv4 = this.getLocalIPv4();
            // Lấy danh sách vị trí nhưng chỉ quan tâm tới cơ sở và số kệ
            const locationCategories = await LocationCategory.find({}, 'coso soke mavitri').catch(err => {
                throw new Error(`Lỗi khi truy vấn LocationCategory: ${err.message}`);
            });
            if (!locationCategories || locationCategories.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy vị trí nào!" });
            }
            // Nhóm vị trí theo cơ sở và số kệ
            const locationGroups = {};
            locationCategories.forEach(loc => {
                if (!loc.coso || !loc.soke) return; // Bỏ qua nếu dữ liệu không hợp lệ
                const key = `${loc.coso}_${loc.soke}`;
                if (!locationGroups[key]) {
                    locationGroups[key] = {
                        coso: loc.coso,
                        soke: loc.soke
                    };
                }
            });
            const qrResults = [];
            for (const key in locationGroups) {
                const { coso, soke } = locationGroups[key];

                // Tạo URL với query params chỉ chứa cơ sở và số kệ
                const qrURL = `http://${localIPv4}:3000/getBookshelf?coso=${encodeURIComponent(coso)}&soke=${encodeURIComponent(soke)}`;

                // Tạo QR code dưới dạng Base64
                const qrBase64 = await QRCode.toDataURL(qrURL, { width: 300 }).catch(err => {
                    throw new Error(`Lỗi khi tạo QR code cho ${coso}_${soke}: ${err.message}`);
                });

                qrResults.push({
                    coso,
                    soke,
                    qrCodeBase64: qrBase64,
                    link: qrURL
                });
            }

            if (qrResults.length === 0) {
                return res.status(404).json({ error: "Không có dữ liệu để tạo QR!" });
            }

            return res.json({
                serverIPv4: localIPv4,
                qrData: qrResults
            });

        } catch (error) {
            console.error("Lỗi khi tạo mã QR:", error);
            return res.status(500).json({ error: error.message || "Lỗi máy chủ!" });
        }
    }


    async getBookshelf(req, res) {
        try {
            const { coso, soke } = req.query;

            if (!coso || !soke) {
                return res.status(400).json({ error: "Vui lòng cung cấp cơ sở và số kệ!" });
            }

            // Lọc vị trí theo cơ sở và số kệ
            const locations = await LocationCategory.find({ coso, soke }).lean();
            if (!locations.length) {
                return res.status(404).json({ error: `Không tìm thấy kệ sách tại Cơ sở: ${coso}, Số kệ: ${soke}` });
            }

            const mavitriList = locations.map(loc => loc.mavitri);

            // Tìm sách theo danh sách mã vị trí
            const books = await ModelBook.find({ "vitri.mavitri": { $in: mavitriList } }).lean();

            // Tạo danh sách sách theo vị trí
            const formattedBooks = [];
            books.forEach(book => {
                book.vitri.forEach(v => {
                    if (mavitriList.includes(v.mavitri)) {
                        formattedBooks.push({
                            masach: book.masach || "Không xác định",
                            tensach: book.tensach || "Không xác định",
                            tacgia: book.tacgia || "Không xác định",
                            img: book.img || "",
                            mota: book.mota || "Không có mô tả",
                            price: book.price || 0,
                            nhaxuatban: book.nhaxuatban || "Không xác định",
                            phienban: book.phienban || "Không xác định",
                            namxb: book.namxb || "Không xác định",
                            pages: book.pages || 0,
                            mavitri: v.mavitri,
                            soluong: v.soluong || 0,
                            soluongmuon: v.soluongmuon || 0,
                            soluong_con: Math.max((v.soluong || 0) - (v.soluongmuon || 0), 0)
                        });
                    }
                });
            });

            return res.json({
                coso,
                soke,
                books: formattedBooks
            });

        } catch (error) {
            console.error("Lỗi khi lấy thông tin sách:", error);
            return res.status(500).json({ error: "Lỗi máy chủ!" });
        }
    }



    // Lấy tất cả vị trí
    async getAllLocations(req, res) {
        try {
            const locations = await LocationCategory.find();
            return res.status(200).json({ message: "Danh sách vị trí", data: locations });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách vị trí:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    } async addLocation(req, res) {
        try {
            const { mavitri, coso, soke } = req.body;

            // Kiểm tra nếu `mavitri` đã tồn tại
            const existingLocation = await LocationCategory.findOne({ mavitri });
            if (existingLocation) {
                return res.status(400).json({ message: "Mã vị trí đã tồn tại!" });
            }

            const newLocation = new LocationCategory({ mavitri, coso, soke });
            await newLocation.save();
            return res.status(201).json({ message: "Thêm vị trí thành công", data: newLocation });

        } catch (error) {
            console.error("Lỗi khi thêm vị trí:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // Cập nhật vị trí
    async updateLocation(req, res) {
        try {
            const { mavitri } = req.body;
            const { coso, soke } = req.body;
            const updatedLocation = await LocationCategory.findOneAndUpdate(
                { mavitri },
                { coso, soke },
                { new: true }
            );
            if (!updatedLocation) {
                return res.status(404).json({ message: "Không tìm thấy vị trí" });
            }
            return res.status(200).json({ message: "Cập nhật vị trí thành công", data: updatedLocation });
        } catch (error) {
            console.error("Lỗi khi cập nhật vị trí:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // Xóa vị trí
    async deleteLocation(req, res) {
        try {
            const { mavitri } = req.body;

            // Kiểm tra xem có sách nào đang sử dụng vị trí này không
            const booksUsingLocation = await ModelBook.findOne({ "vitri.mavitri": mavitri });

            if (booksUsingLocation) {
                return res.status(400).json({ message: "Không thể xóa! Có sách đang ở vị trí này." });
            }

            // Nếu không có sách nào sử dụng vị trí này, tiến hành xóa
            const deletedLocation = await LocationCategory.findOneAndDelete({ mavitri });

            if (!deletedLocation) {
                return res.status(404).json({ message: "Không tìm thấy vị trí!" });
            }

            return res.status(200).json({ message: "Xóa vị trí thành công!" });

        } catch (error) {
            console.error("Lỗi khi xóa vị trí:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }


    // Lấy sách theo mã vị trí
    async getBooksByLocation(req, res) {
        try {
            const { mavitri } = req.query;
            console.log("Tìm sách với mã vị trí:", mavitri);

            // Kiểm tra nếu mavitri không được cung cấp
            if (!mavitri) {
                return res.status(400).json({ message: "Thiếu mã vị trí (mavitri)!" });
            }

            // Tìm sách có mã vị trí trong mảng vitri
            const books = await ModelBook.find({ vitri: { $elemMatch: { mavitri: mavitri } } });

            console.log("Kết quả tìm kiếm:", books);

            if (!books.length) {
                return res.status(404).json({ message: "Không tìm thấy sách tại vị trí này" });
            }

            // Trả về đầy đủ thông tin của sách, nhưng lọc mảng vitri để chỉ hiển thị vị trí tương ứng
            const result = books.map(book => ({
                masach: book.masach,
                tensach: book.tensach,
                img: book.img,
                tacgia: book.tacgia,
                nhaxuatban: book.nhaxuatban,
                phienban: book.phienban,
                madanhmuc: book.madanhmuc,
                namxb: book.namxb,
                mota: book.mota,
                ngaycapnhat: book.ngaycapnhat,
                vitri: book.vitri.filter(vitri => vitri.mavitri === mavitri), // Lọc theo mã vị trí
                pages: book.pages,
                price: book.price
            }));

            return res.status(200).json({ message: `Danh sách sách tại vị trí ${mavitri}`, data: result });
        } catch (error) {
            console.error("Lỗi khi lấy sách theo vị trí:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // Tìm vị trí theo mã vị trí
    async getLocationByMaViTri(req, res) {
        try {
            const { mavitri } = req.body;
            const location = await LocationCategory.findOne({ mavitri });

            if (!location) {
                return res.status(404).json({ message: "Không tìm thấy vị trí!" });
            }

            return res.status(200).json({ message: "Thông tin vị trí", data: location });
        } catch (error) {
            console.error("Lỗi khi tìm vị trí theo mã vị trí:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

}

module.exports = new ControllerLocationCategory();
