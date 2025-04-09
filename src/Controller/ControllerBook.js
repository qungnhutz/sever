const ModelBook = require('../Model/ModelBook');
const ModelBookGenre = require('../Model/ModelBookGenre');
const ModelHandleBook = require('../Model/ModelHandleBook');
const LocationCategory = require('../Model/ModelLocationCategory');
const mongoose = require('mongoose');

class ControllerBook {
    // Thêm sách mới
    async AddBook(req, res) {
        try {
            const { masach, img, tensach, tacgia, nhaxuatban, phienban, madanhmuc, namxb, mota, vitri, pages, price } = req.body;

            // Kiểm tra đầu vào hợp lệ
            if (!masach || !tensach || !tacgia || !nhaxuatban || !phienban || !madanhmuc || !namxb || !mota ||
                !Array.isArray(vitri) || vitri.length === 0 || pages < 0 || price < 0) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ và hợp lệ thông tin sách !!!' });
            }

            // Kiểm tra mã sách đã tồn tại chưa
            const existingBook = await ModelBook.findOne({ masach });
            if (existingBook) {
                return res.status(400).json({ message: 'Mã sách đã tồn tại !!!' });
            }

            // Kiểm tra mã danh mục có tồn tại không
            const categoryExists = await ModelBookGenre.findOne({ madanhmuc });
            if (!categoryExists) {
                return res.status(400).json({ message: 'Mã danh mục không tồn tại !!!' });
            }

            // Kiểm tra mã vị trí có tồn tại không
            const locationIds = vitri.map(item => item.mavitri); // Lấy danh sách mã vị trí từ dữ liệu nhập vào
            const existingLocations = await LocationCategory.find({ mavitri: { $in: locationIds } });

            if (existingLocations.length !== locationIds.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều mã vị trí không tồn tại !!!' });
            }

            // Chuẩn hóa danh sách vị trí
            const formattedVitri = vitri.map(item => ({
                mavitri: item.mavitri,
                soluong: item.soluong >= 0 ? item.soluong : 0,
                soluongmuon: 0
            }));

            // Tạo mới sách
            const book = new ModelBook({
                masach, img, tensach, tacgia, nhaxuatban, phienban, madanhmuc, namxb, mota,
                vitri: formattedVitri, pages, price
            });

            await book.save();
            return res.status(201).json({ message: 'Thêm sách thành công !!!', book });

        } catch (error) {
            console.error("Lỗi khi thêm sách:", error);
            return res.status(500).json({ message: 'Đã xảy ra lỗi, vui lòng thử lại !!!' });
        }
    }

    async  GetBooks(req, res) {
        try {
            // 🔹 Lấy danh sách sách
            const dataBooks = await ModelBook.find({});

            // 🔹 Lấy danh sách danh mục sách
            const bookGenres = await ModelBookGenre.find({});
            const genreMap = bookGenres.reduce((map, genre) => {
                map[genre.madanhmuc] = genre.tendanhmuc;
                return map;
            }, {});

            // 🔹 Lấy danh sách vị trí
            const locationCategories = await LocationCategory.find({});
            const locationMap = locationCategories.reduce((map, loc) => {
                map[loc.mavitri] = loc.coso;
                return map;
            }, {});

            // 🔹 Format lại dữ liệu sách
            const formattedBooks = dataBooks.map(book => {
                // Tính số lượng còn lại theo từng vị trí
                const vitriFormatted = book.vitri.map(v => ({
                    mavitri: v.mavitri,
                    coso: locationMap[v.mavitri] || "Không xác định", // Thêm tên cơ sở
                    soluong: v.soluong,
                    soluongmuon: v.soluongmuon,
                    soluong_con: v.soluong - v.soluongmuon // Số lượng còn lại tại vị trí
                }));

                // Tính tổng số lượng của sách
                const tongsoluong = vitriFormatted.reduce((sum, v) => sum + v.soluong, 0);

                return {
                    masach: book.masach,
                    tensach: book.tensach,
                    tacgia: book.tacgia,
                    nhaxuatban: book.nhaxuatban,
                    phienban: book.phienban,
                    madanhmuc: book.madanhmuc,
                    tendanhmuc: genreMap[book.madanhmuc] || "Không xác định", // Thêm tên danh mục
                    namxb: book.namxb,
                    mota: book.mota,
                    pages: book.pages,
                    price: book.price,
                    img: book.img,
                    ngaycapnhat: book.ngaycapnhat,
                    vitri: vitriFormatted,
                    Tongsoluong: tongsoluong // Tổng số lượng sách
                };
            });

            res.status(200).json(formattedBooks);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách sách:", error);
            res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }



    // Cập nhật sách
    async UpdateBook(req, res) {
        try {
            const { masach, tensach, tacgia, nhaxuatban, phienban, madanhmuc, namxb, mota, vitri, pages, price, img } = req.body;

            console.log('masach', masach);
            if (!masach) {
                return res.status(400).json({ message: 'Thiếu mã sách !!!' });
            }

            const book = await ModelBook.findOne({ masach });
            if (!book) {
                return res.status(404).json({ message: 'Không tìm thấy sách !!!' });
            }

            if (pages < 0 || price < 0) {
                return res.status(400).json({ message: 'Số trang và giá không được âm !!!' });
            }

            let updatedVitri = book.vitri;
            if (Array.isArray(vitri)) {
                updatedVitri = vitri.map(item => {
                    const existingLocation = book.vitri.find(v => v.mavitri === item.mavitri);
                    return {
                        mavitri: item.mavitri,
                        soluong: item.soluong >= 0 ? item.soluong : 0,
                        soluongmuon: existingLocation ? existingLocation.soluongmuon : 0
                    };
                });
            }

            const updatedBook = await ModelBook.findOneAndUpdate(
                { masach },
                {
                    tensach: tensach || book.tensach,
                    tacgia: tacgia || book.tacgia,
                    nhaxuatban: nhaxuatban || book.nhaxuatban,
                    phienban: phienban || book.phienban,
                    madanhmuc: madanhmuc || book.madanhmuc,
                    namxb: namxb || book.namxb,
                    mota: mota || book.mota,
                    vitri: updatedVitri,
                    pages: pages !== undefined ? pages : book.pages,
                    price: price !== undefined ? price : book.price,
                    img: img || book.img,
                    ngaycapnhat: Date.now()
                },
                { new: true }
            );

            return res.status(200).json({ message: 'Cập nhật sách thành công !!!', book: updatedBook });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }



    async DeleteBook(req, res) {
        try {
            const { masach } = req.body;// Lấy 'masach' thay vì '_id'

            if (!masach) {
                return res.status(400).json({ message: 'Thiếu mã sách' });
            }

            // Kiểm tra xem sách có tồn tại không
            const book = await ModelBook.findOne({ masach });
            if (!book) {
                return res.status(404).json({ message: 'Không tìm thấy sách' });
            }

            // Kiểm tra xem sách có phiếu mượn nào không
            const borrowRecords = await ModelHandleBook.find({ masach });

            // Nếu có phiếu mượn, kiểm tra tất cả 'tinhtrang'
            const hasUnreturnedBooks = borrowRecords.some(record => !record.tinhtrang);

            if (hasUnreturnedBooks) {
                return res.status(400).json({ message: 'Không thể xóa, sách vẫn đang được mượn !!!' });
            }

            // Xóa sách vì tất cả phiếu mượn đã trả
            const result = await ModelBook.deleteOne({ masach });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Không tìm thấy sách để xóa' });
            }

            res.status(200).json({ message: 'Xóa sách thành công', result });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi khi xóa sách', error });
        }
    }

    // Tìm kiếm sách theo tên
    async SearchProduct(req, res) {
        try {
            let keyword = req.query.tensach?.trim();

            if (!keyword) {
                return res.status(400).json({ message: 'Vui lòng nhập từ khóa tìm kiếm!' });
            }

            // Chuẩn hóa từ khóa tìm kiếm
            const normalizeText = (text) => {
                return text
                    .normalize("NFD") // Tách dấu khỏi ký tự
                    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
                    .toLowerCase(); // Chuyển về chữ thường
            };

            const normalizedKeyword = normalizeText(keyword);

            // Tìm kiếm và chuẩn hóa dữ liệu trong DB
            const dataProducts = await ModelBook.find();
            const filteredBooks = dataProducts.filter(book =>
                normalizeText(book.tensach).includes(normalizedKeyword)
            );

            if (filteredBooks.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy sách !!!' });
            }

            const formattedBooks = filteredBooks.map(book => ({
                ...book.toObject(),
                mavitri: book.vitri.map(v => v.mavitri).join(', '),
                currentQuantity: book.currentQuantity
            }));

            return res.status(200).json(formattedBooks);
        } catch (error) {
            console.error('Lỗi tìm kiếm sách:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ!' });
        }
    }

    async SearchBookByMaSach(req, res) {
        try {
            const { masach } = req.query;

            if (!masach) {
                return res.status(400).json({ message: 'Vui lòng nhập mã sách !!!' });
            }

            // 🔹 Tìm sách theo mã sách
            const book = await ModelBook.findOne({ masach });

            if (!book) {
                return res.status(404).json({ message: 'Không tìm thấy sách !!!' });
            }

            // 🔹 Lấy danh sách danh mục
            const bookGenres = await ModelBookGenre.find({});
            const genreMap = bookGenres.reduce((map, genre) => {
                map[genre.madanhmuc] = genre.tendanhmuc;
                return map;
            }, {});

            // 🔹 Lấy danh sách vị trí
            const locationCategories = await LocationCategory.find({});
            const locationMap = locationCategories.reduce((map, loc) => {
                map[loc.mavitri] = loc.coso;
                return map;
            }, {});

            // 🔹 Format lại dữ liệu vị trí
            const vitriFormatted = book.vitri.map(v => ({
                mavitri: v.mavitri,
                coso: locationMap[v.mavitri] || "Không xác định", // Thêm tên cơ sở
                soluong: v.soluong,
                soluongmuon: v.soluongmuon,
                soluong_con: v.soluong - v.soluongmuon // Số lượng còn lại tại vị trí
            }));

            // 🔹 Tính tổng số lượng sách
            const tongsoluong = vitriFormatted.reduce((sum, v) => sum + v.soluong, 0);

            // 🔹 Chuẩn bị dữ liệu trả về
            const formattedBook = {
                masach: book.masach,
                tensach: book.tensach,
                tacgia: book.tacgia,
                nhaxuatban: book.nhaxuatban,
                phienban: book.phienban,
                madanhmuc: book.madanhmuc,
                tendanhmuc: genreMap[book.madanhmuc] || "Không xác định", // Thêm tên danh mục
                namxb: book.namxb,
                mota: book.mota,
                pages: book.pages,
                price: book.price,
                img: book.img,
                ngaycapnhat: book.ngaycapnhat,
                vitri: vitriFormatted,
                Tongsoluong: tongsoluong // Tổng số lượng sách
            };

            return res.status(200).json(formattedBook);
        } catch (error) {
            console.error("Lỗi khi tìm sách theo mã sách:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async GetLatestUpdatedBooks(req, res) {
        try {
            // Lấy 20 sách có ngày cập nhật gần nhất
            const books = await ModelBook.find({})
                .sort({ ngaycapnhat: -1 }) // Sắp xếp giảm dần theo ngày cập nhật
                .limit(10);

            return res.status(200).json(books);
        } catch (error) {
            console.error(" Lỗi khi lấy danh sách sách cập nhật gần nhất:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async GetMostBorrowedBooks(req, res) {
        try {
            // Lấy sách có lượt mượn nhiều nhất trước
            const books = await ModelBook.find({})
                .sort({ soluongmuon: -1 }) // Sắp xếp giảm dần theo số lượt mượn
                .limit(20); // Giới hạn 20 sách nếu cần

            return res.status(200).json(books);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách sách mượn nhiều nhất:", error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

}

module.exports = new ControllerBook();
