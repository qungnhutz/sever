const LocationCategory = require('../Model/ModelLocationCategory');
const ModelBook = require('../Model/ModelBook');
const QRCode = require('qrcode'); //npm install qrcode
const ModelBookGenre = require('../Model/ModelBookGenre');
const fs = require('fs');
const path = require('path');

// 🛠 Định nghĩa thư mục lưu QR code bên ngoài class
const qrFolderPath = path.join(__dirname, '../qr_output');

// Kiểm tra nếu thư mục chưa tồn tại thì tạo mới
if (!fs.existsSync(qrFolderPath)) {
    fs.mkdirSync(qrFolderPath, { recursive: true });
}

class ControllerLocationCategory {


async  generateQRCodePerShelf(req, res) {
    try {
        const dataBooks = await ModelBook.find({});
        const bookGenres = await ModelBookGenre.find({});
        const locationCategories = await LocationCategory.find({});

        const genreMap = bookGenres.reduce((map, genre) => {
            map[genre.madanhmuc] = genre.tendanhmuc;
            return map;
        }, {});

        const locationMap = {};
        locationCategories.forEach(loc => {
            locationMap[loc.mavitri] = { coso: loc.coso, soke: loc.soke };
        });

        const shelfMap = {}; // Nhóm theo coso + soke

        for (const book of dataBooks) {
            for (const v of book.vitri) {
                const location = locationMap[v.mavitri];
                if (!location) continue;

                const key = `${location.coso}_${location.soke}`;
                if (!shelfMap[key]) {
                    shelfMap[key] = {
                        coso: location.coso,
                        soke: location.soke,
                        books: []
                    };
                }

                shelfMap[key].books.push({
                    masach: book.masach,
                    tensach: book.tensach,
                    tacgia: book.tacgia,
                    tendanhmuc: genreMap[book.madanhmuc] || "Không xác định",
                    soluong: v.soluong,
                    soluongmuon: v.soluongmuon,
                    soluong_con: v.soluong - v.soluongmuon,
                    mavitri: v.mavitri
                });
            }
        }

        // 🔻 Tạo mã QR cho từng cặp coso + soke
        const qrResults = [];

        for (const key in shelfMap) {
            const shelfData = shelfMap[key];

            // Tạo QR từ dữ liệu JSON
            const qrText = JSON.stringify({
                coso: shelfData.coso,
                soke: shelfData.soke,
                books: shelfData.books
            });

            const qrImage = await QRCode.toDataURL(qrText);
            qrResults.push({
                coso: shelfData.coso,
                soke: shelfData.soke,
                qrCode: qrImage,
                totalBooks: shelfData.books.length
            });

            // 🛠 Ghi file QR code vào thư mục qr_output
            const fileName = `qr_${shelfData.coso}_${shelfData.soke}.png`;
            const filePath = path.join(qrFolderPath, fileName);

            await QRCode.toFile(filePath, qrText);
        }

        return res.status(200).json({
            message: "Tạo mã QR theo từng kệ thành công!",
            data: qrResults
        });

    } catch (error) {
        console.error("Lỗi khi tạo mã QR:", error);
        return res.status(500).json({ message: "Lỗi máy chủ!" });
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
