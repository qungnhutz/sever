const ModelReader = require('../Model/ModelReader');
const bcrypt = require('bcrypt');
const ModelUser = require('../Model/ModelUser');
class ControllerReader {
    // 📌 Lấy danh sách tất cả bạn đọc
    async getAllReaders(req, res) {
        try {
            const readers = await ModelReader.find();
            return res.status(200).json({ message: 'Danh sách bạn đọc', data: readers });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách bạn đọc:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ!' });
        }
    }

    // 📌 Thêm bạn đọc mới // thêm luôn user cùng lúc
    async addReader(req, res) {
        try {
            let { masinhvien, hoten, address, ngaysinh, sdt, email, typereader } = req.body;

            // 🔹 Chuẩn hóa dữ liệu đầu vào
            masinhvien = masinhvien?.trim();
            hoten = hoten?.trim();
            email = email?.trim();
            address = address?.trim();
            sdt = sdt?.trim();
            typereader = typereader?.trim();

            // 🔹 Kiểm tra bắt buộc nhập đủ thông tin
            if (!masinhvien || !hoten || !email || !address || !ngaysinh || !sdt || !typereader) {
                return res.status(400).json({ message: 'Yêu cầu nhập đầy đủ thông tin' });
            }

            // 🔹 Không cho phép dấu cách trong mã sinh viên
            if (masinhvien.includes(' ')) {
                return res.status(400).json({ message: 'Mã sinh viên không được chứa dấu cách!' });
            }

            // 🔹 Kiểm tra mã sinh viên đã tồn tại chưa
            const existingReaderById = await ModelReader.findOne({ masinhvien });
            if (existingReaderById) {
                return res.status(400).json({ message: 'Mã sinh viên đã tồn tại!' });
            }

            // 🔹 Kiểm tra định dạng email hợp lệ
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Email không đúng định dạng!' });
            }

            // 🔹 Kiểm tra email đã tồn tại chưa
            const existingReaderByEmail = await ModelReader.findOne({ email });
            if (existingReaderByEmail) {
                return res.status(400).json({ message: 'Email đã được sử dụng!' });
            }

            // 🔹 Kiểm tra số điện thoại hợp lệ
            const phoneRegex = /^(?:\+84|0)(3|5|7|8|9)[0-9]{8}$/; // Hỗ trợ số điện thoại Việt Nam
            if (!phoneRegex.test(sdt)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam hợp lệ (VD: 0987654321, +84987654321)' });
            }

            // 🔹 Thêm bạn đọc mới
            const newReader = new ModelReader({ masinhvien, hoten, address, ngaysinh, sdt, email, typereader });
            await newReader.save();

            // 🔹 Kiểm tra user đã tồn tại chưa (để tạo tài khoản nếu chưa có)
            const existingUser = await ModelUser.findOne({ masinhvien });
            // Lấy ID cuối cùng
            if (!existingUser) {
                // 🔹 Lấy ID lớn nhất rồi tăng lên 1
                const lastUser = await ModelUser.findOne().sort({ id: -1 }).select('id').lean();
                const newId = lastUser && !isNaN(parseInt(lastUser.id, 10)) ? (parseInt(lastUser.id, 10) + 1).toString() : "1";

                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(masinhvien, saltRounds);
                const newUser = new ModelUser({
                    id: newId,
                    masinhvien,
                    password: hashedPassword,
                    isAdmin: false // Mặc định là user, không phải admin
                });
                await newUser.save();
            }

            return res.status(201).json({ message: 'Thêm bạn đọc thành công!', reader: newReader });

        } catch (error) {
            console.error('❌ Lỗi khi thêm bạn đọc:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ!' });
        }
    }

    async getReaderByMaSinhVien(req, res) {
        try {
            let { masinhvien } = req.query;

            if (!masinhvien) {
                return res.status(400).json({ message: 'Thiếu mã sinh viên!' });
            }

            // Xóa khoảng trắng thừa
            masinhvien = masinhvien.trim();

            // Tìm bạn đọc theo mã sinh viên (khớp gần đúng, không phân biệt hoa thường)
            const reader = await ModelReader.find({
                masinhvien: { $regex: masinhvien, $options: 'i' } // Bỏ ^ và $ để tìm kiếm gần đúng
            });

            if (reader.length === 0) {
                return res.status(404).json({ message: 'Không tìm thấy bạn đọc!' });
            }

            return res.status(200).json({ message: 'Thông tin bạn đọc', reader });
        } catch (error) {
            console.error('❌ Lỗi khi lấy thông tin bạn đọc:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ!' });
        }
    }
    // 📌 Sửa thông tin bạn đọc
    async editReader(req, res) {
        try {
            const { masinhvien, hoten, address, ngaysinh, sdt, email, typereader } = req.body;

            if (!masinhvien) {
                return res.status(400).json({ message: 'Thiếu mã sinh viên!' });
            }

            // Tìm bạn đọc theo mã sinh viên
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy bạn đọc!' });
            }

            // Cập nhật thông tin
            reader.hoten = hoten || reader.hoten;
            reader.address = address || reader.address;
            reader.ngaysinh = ngaysinh || reader.ngaysinh;
            reader.sdt = sdt || reader.sdt;
            reader.email = email || reader.email;
            reader.typereader = typereader || reader.typereader;

            await reader.save();

            return res.status(200).json({ message: 'Cập nhật bạn đọc thành công!', reader });
        } catch (error) {
            console.error('❌ Lỗi khi cập nhật bạn đọc:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ!' });
        }
    }

    // 📌 Xóa bạn đọc
    // 📌 Xóa bạn đọc
    async deleteReader(req, res) {
        try {
            const { masinhvien } = req.body;

            if (!masinhvien) {
                return res.status(400).json({ message: 'Thiếu mã sinh viên!' });
            }

            // 🔹 Kiểm tra bạn đọc có tồn tại không
            const reader = await ModelReader.findOne({ masinhvien });
            if (!reader) {
                return res.status(404).json({ message: 'Không tìm thấy bạn đọc!' });
            }

            // 🔹 Kiểm tra tài khoản người dùng trong ModelUser
            const user = await ModelUser.findOne({ masinhvien });
            if (user && user.isAdmin) {
                return res.status(403).json({ message: 'Không thể xóa tài khoản Admin!' });
            }

            // 🔹 Xóa bạn đọc
            await ModelReader.deleteOne({ masinhvien });

            // 🔹 Xóa tài khoản nếu không phải Admin
            if (user) {
                await ModelUser.deleteOne({ masinhvien });
            }

            return res.status(200).json({ message: 'Xóa bạn đọc và tài khoản thành công!' });
        } catch (error) {
            console.error('❌ Lỗi khi xóa bạn đọc:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ!' });
        }
    }


}

module.exports = new ControllerReader();
