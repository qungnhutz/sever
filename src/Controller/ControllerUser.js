const ModelUser = require('../Model/ModelUser');
const ModelReader = require('../Model/ModelReader');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { jwtDecode } = require('jwt-decode');
const jwt = require('jsonwebtoken');
class UserController {
    async getStudentFromToken(req, res) {
        try {
            const token = req.cookies?.Token || req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Không có token !!!' });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const student = await ModelReader.findOne({ masinhvien: decoded.masinhvien });
            if (!student) {
                return res.status(404).json({ message: 'Không tìm thấy sinh viên !!!' });
            }
            return res.status(200).json(student);
        } catch (error) {
            console.error('Lỗi khi lấy sinh viên từ token:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    async login(req, res) {
        try {
            const { masinhvien, password } = req.body;
            if (!masinhvien || !password) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' });
            }

            const user = await ModelUser.findOne({ masinhvien });
            if (!user) return res.status(401).json({ message: 'Mã Sinh Viên hoặc Mật Khẩu không chính xác!' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ message: 'Mã Sinh Viên hoặc Mật Khẩu không chính xác!' });

            // Tạo token
            const token = jwt.sign(
                {
                    masinhvien: user.masinhvien,
                    isAdmin: user.isAdmin,
                    id: user._id
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.EXPIRES_IN || '1h' }
            );

            // Lưu token vào cookie với cấu hình phù hợp
            res.cookie('Token', token, {
                httpOnly: true,
                secure: false, // Đặt thành true nếu dùng HTTPS, false để test trên HTTP
                maxAge: 3600 * 1000, // 1 giờ
                path: '/',
                sameSite: 'Lax' // Hoặc 'None' nếu cần gửi cross-origin (kèm secure: true)
            });

            return res.status(200).json({
                message: 'Đăng Nhập Thành Công !!!',
                token
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Lỗi máy chủ !!!' });
        }
    }

    logout(req, res) {
        res.clearCookie('Token').status(200).json({ message: 'Đăng xuất thành công!' });
    }
    // Đổi mật khẩu
    async changePassword(req, res) {
        try {
            // Lấy token từ cookie và giải mã
            const token = req.cookies;
            if (!token || !token.Token) {
                return res.status(401).json({ message: 'Không có token !!!' });
            }
            const decoded = jwtDecode(token.Token);
            const dataUser = await ModelUser.findOne({ masinhvien: decoded.masinhvien });

            if (!dataUser) {
                return res.status(403).json({ message: 'Tài khoản không tồn tại !!!' });
            }

            const { oldPass, newPass, confirmNewPass } = req.body;

            // Kiểm tra nếu thiếu thông tin
            if (!oldPass || !newPass || !confirmNewPass) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin !!!' });
            }

            // Kiểm tra mật khẩu cũ có đúng không
            const isMatch = await bcrypt.compare(oldPass, dataUser.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Mật khẩu cũ không đúng !!!' });
            }

            // Kiểm tra mật khẩu mới có khớp không
            if (newPass !== confirmNewPass) {
                return res.status(400).json({ message: 'Mật khẩu mới không khớp !!!' });
            }

            // Mã hóa mật khẩu mới
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPass, saltRounds);

            // Cập nhật mật khẩu mới
            await dataUser.updateOne({ password: hashedPassword });

            return res.status(200).json({ message: 'Thay đổi mật khẩu thành công !!!' });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Đã xảy ra lỗi !!!' });
        }

    }
    async verifyOTP(req, res) {
        try {
            const { masinhvien, otp, newPassword } = req.body;
            const user = await ModelUser.findOne({ masinhvien });

            if (!user) return res.status(404).json({ message: 'Mã sinh viên không tồn tại!' });
            const isOTPValid = await bcrypt.compare(otp, user.otp);
            if (!isOTPValid || Date.now() > new Date(user.otpExpires).getTime()) {
                return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn!' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            user.otp = null;
            user.otpExpires = null;
            await user.save();

            return res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
        } catch (error) {
            console.error('Lỗi xác minh OTP:', error);
            return res.status(500).json({ message: 'Lỗi server khi xác minh OTP!' });
        }
    }


    // Lấy danh sách tất cả người dùng
    async getAllUsers(req, res) {
        try {
            const users = await ModelUser.find();
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server', error });
        }
    }

    // Lấy thông tin người dùng bằng mã sinh viên
    async getUserByMaSinhVien(req, res) {
        try {
            let { masinhvien } = req.query;

            if (!masinhvien) {
                return res.status(400).json({ message: "Vui lòng nhập mã sinh viên!" });
            }

            masinhvien = masinhvien.trim(); // Xóa khoảng trắng ở đầu và cuối

            // Tìm kiếm gần đúng
            const users = await ModelUser.find({
                masinhvien: { $regex: masinhvien, $options: "i" }
            });

            if (users.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy người dùng" });
            }

            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ message: "Lỗi server", error });
        }
    }



    // Thêm người dùng mới
    async createUser(req, res) {
        try {
            let { masinhvien, password, email, hoten, address, ngaysinh, sdt, typereader } = req.body;
            const saltRounds = 10;
            masinhvien = masinhvien?.trim();
            password = password?.trim();
            email = email?.trim();
            sdt = sdt?.trim();
            if (!masinhvien || !password || !email) {
                return res.status(400).json({ message: 'Vui lòng nhập mã sinh viên, mật khẩu và email!' });
            }
            if (masinhvien.includes(' ')) {
                return res.status(400).json({ message: 'Mã sinh viên không được chứa dấu cách!' });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Email không hợp lệ!' });
            }
            const phoneRegex = /^\+?\d{10,15}$/;
            if (sdt && !phoneRegex.test(sdt)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ!' });
            }

            // Kiểm tra xem mã sinh viên hoặc email đã tồn tại trong User
            const existingUser = await ModelUser.findOne({ $or: [{ masinhvien }, { email }] });
            if (existingUser) {
                return res.status(400).json({ message: 'Mã sinh viên hoặc email đã tồn tại!' });
            }

            // Kiểm tra xem email đã tồn tại trong Reader chưa
            const existingReader = await ModelReader.findOne({ email });
            if (existingReader) {
                return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống!' });
            }

            // Mã hóa mật khẩu
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Lấy ID cuối cùng
            const lastUser = await ModelUser.findOne({}, { id: 1 }).sort({ id: -1 }).lean();
            const newId = lastUser && !isNaN(parseInt(lastUser.id, 10)) ? (parseInt(lastUser.id, 10) + 1).toString() : "1";

            // Tạo User mới
            const newUser = new ModelUser({
                id: newId,
                masinhvien,
                email,
                password: hashedPassword
            });

            // Tạo Reader mới
            const newReader = new ModelReader({
                masinhvien,
                email,
                hoten: hoten?.trim() || '',
                address: address?.trim() || '',
                ngaysinh: ngaysinh || null,
                sdt: sdt || '',
                typereader: typereader || ''
            });

            // Lưu vào database
            await newUser.save();
            await newReader.save();

            return res.status(201).json({ message: 'Đăng ký thành công!', userId: newUser.id });

        } catch (error) {
            return res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }


    async updateUser(req, res) {
        try {
            const { masinhvien } = req.body;
            const { isAdmin } = req.body; // Chỉ cập nhật quyền Admin

            // Kiểm tra xem có dữ liệu hợp lệ không
            if (typeof isAdmin === 'undefined') {
                return res.status(400).json({ message: 'Thiếu thông tin cập nhật' });
            }

            // Tìm người dùng theo `masinhvien`
            const user = await ModelUser.findOne({ masinhvien });

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            // Chỉ cập nhật quyền Admin, không thay đổi mã sinh viên
            user.isAdmin = isAdmin;

            await user.save();
            res.status(200).json({ message: 'Cập nhật thành công', user });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server', error });
        }
    }


    // Xóa người dùng
    async deleteUser(req, res) {
        try {
            const { masinhvien } = req.body;

            // Tìm user trước khi xóa
            const user = await ModelUser.findOne({ masinhvien });
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            // Kiểm tra nếu user là admin
            if (user.isAdmin) {
                return res.status(403).json({ message: 'Không thể xóa tài khoản admin!' });
            }

            // Xóa tài khoản nếu không phải admin
            await ModelUser.deleteOne({ masinhvien });

            res.status(200).json({ message: 'Xóa thành công' });
        } catch (error) {
            res.status(500).json({ message: 'Lỗi server', error });
        }
    }

}

module.exports = new UserController();
