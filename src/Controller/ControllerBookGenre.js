const BookGenre = require('../Model/ModelBookGenre');
const Book = require('../Model/ModelBook');
// 📌 Tìm kiếm gần đúng theo tên danh mục
const diacritics = require('diacritics'); //npm install diacritics


class ControllerBookGenre {
    // 📌 Thêm danh mục mới
    async addCategory(req, res) {
        try {
            const { madanhmuc, tendanhmuc } = req.body;

            if (!madanhmuc || !tendanhmuc) {
                return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
            }

            // Kiểm tra danh mục đã tồn tại chưa
            const existingCategory = await BookGenre.findOne({ madanhmuc });
            if (existingCategory) {
                return res.status(400).json({ message: "Mã danh mục đã tồn tại!" });
            }

            const newCategory = new BookGenre({ madanhmuc, tendanhmuc });
            await newCategory.save();

            return res.status(201).json({ message: "Thêm danh mục thành công!", category: newCategory });
        } catch (error) {
            console.error("Lỗi khi thêm danh mục:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Xóa danh mục
    async deleteCategory(req, res) {
        try {
            const { madanhmuc } = req.body;

            if (!madanhmuc) {
                return res.status(400).json({ message: "Vui lòng cung cấp mã danh mục!" });
            }

            // Kiểm tra danh mục có tồn tại không
            const category = await BookGenre.findOne({ madanhmuc });
            if (!category) {
                return res.status(404).json({ message: "Danh mục không tồn tại!" });
            }

            // Kiểm tra xem có sách nào thuộc danh mục này không
            const booksInCategory = await Book.findOne({ madanhmuc });
            if (booksInCategory) {
                return res.status(400).json({ message: "Không thể xóa danh mục vì vẫn còn sách thuộc danh mục này!" });
            }

            await BookGenre.deleteOne({ madanhmuc });
            return res.status(200).json({ message: "Xóa danh mục thành công!" });
        } catch (error) {
            console.error("Lỗi khi xóa danh mục:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Lấy danh sách tất cả danh mục
    async getAllCategories(req, res) {
        try {
            const categories = await BookGenre.find();
            return res.status(200).json({ message: "Danh sách danh mục", data: categories });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách danh mục:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }

    // 📌 Lấy tất cả sách theo danh mục
    async getBooksByCategory(req, res) {
        try {
            const { madanhmuc } = req.query; // Lấy từ query params

            if (!madanhmuc) {
                return res.status(400).json({ message: "Vui lòng cung cấp mã danh mục!" });
            }

            // Ép kiểu `madanhmuc` thành string trước khi tìm kiếm
            const books = await Book.find({ madanhmuc: String(madanhmuc) });

            if (books.length === 0) {
                return res.status(404).json({ message: "Không có sách nào trong danh mục này!" });
            }

            // Format lại dữ liệu sách và tính tổng số lượng
            const formattedBooks = books.map(book => {
                // Tính số lượng còn lại theo từng vị trí
                const vitriFormatted = book.vitri.map(v => ({
                    mavitri: v.mavitri,
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

            return res.status(200).json({ message: "Lấy sách theo danh mục thành công!", books: formattedBooks });
        } catch (error) {
            console.error("Lỗi khi lấy sách theo danh mục:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }
    // 📌 Sửa tên danh mục theo mã danh mục
    async updateCategory(req, res) {
        try {
            const { madanhmuc, tendanhmuc } = req.body;

            if (!madanhmuc || !tendanhmuc) {
                return res.status(400).json({ message: "yêu cầu nhập đủ thông tin "});
            }

            // Kiểm tra danh mục có tồn tại không
            const category = await BookGenre.findOne({ madanhmuc });
            if (!category) {
                return res.status(404).json({ message: "Danh mục không tồn tại!" });
            }

            // Cập nhật tên danh mục
            category.tendanhmuc = tendanhmuc;
            await category.save();

            return res.status(200).json({ message: "Cập nhật tên danh mục thành công!", category });
        } catch (error) {
            console.error("Lỗi khi cập nhật danh mục:", error);
            return res.status(500).json({ message: "Lỗi máy chủ!" });
        }
    }



async  searchCategories(req, res) {
    try {
        const { tendanhmuc } = req.query;
        if (!tendanhmuc) {
            return res.status(400).json({ message: "Vui lòng nhập tên danh mục để tìm kiếm!" });
        }

        // Loại bỏ dấu tiếng Việt
        const normalizedQuery = diacritics.remove(tendanhmuc.toLowerCase());

        // Lấy tất cả danh mục
        const allCategories = await BookGenre.find();

        // Lọc danh mục bằng cách so sánh chuỗi không dấu
        const matchedCategories = allCategories.filter(category =>
            diacritics.remove(category.tendanhmuc.toLowerCase()).includes(normalizedQuery)
        );

        if (matchedCategories.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy danh mục nào phù hợp!" });
        }

        return res.status(200).json({ message: "Tìm kiếm thành công!", data: matchedCategories });
    } catch (error) {
        console.error("❌ Lỗi khi tìm kiếm danh mục:", error);
        return res.status(500).json({ message: "Lỗi máy chủ!" });
    }
}


}

module.exports = new ControllerBookGenre();
