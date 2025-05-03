const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const ModelUser = require('../Model/ModelUser');
const ModelReader = require('../Model/ModelReader');
const crypto = require('crypto');
const bcrypt = require('bcrypt'); // Mã hóa OTP
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const EMAIL_USER = process.env.EMAIL_USER;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

class ControllerEmail {
    async sendOTP(req, res) {
        try {
            const { masinhvien, email } = req.body;

            // 🔹 Kiểm tra đầu vào
            if (!masinhvien || !email) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mã sinh viên và email!' });
            }

            // 🔹 Tìm kiếm sinh viên trong ModelReader
            const reader = await ModelReader.findOne({ masinhvien, email });
            if (!reader) {
                return res.status(404).json({ message: 'Mã sinh viên hoặc email không đúng!' });
            }

            // 🔹 Kiểm tra tài khoản có tồn tại trong ModelUser không
            const user = await ModelUser.findOne({ masinhvien });
            if (!user) {
                return res.status(404).json({ message: 'Tài khoản không tồn tại!' });
            }

            // 🔹 Tạo mã OTP ngẫu nhiên
            const otpCode = crypto.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hết hạn sau 10 phút
            const hashedOTP = await bcrypt.hash(otpCode, 10); // Mã hóa OTP

            // 🔹 Lưu OTP vào ModelUser
            user.otp = hashedOTP;
            user.otpExpires = expiresAt;
            await user.save();

            // 🔹 Lấy accessToken để gửi email
            const accessToken = await oAuth2Client.getAccessToken();
            if (!accessToken.token) {
                return res.status(500).json({ message: 'Không thể lấy accessToken để gửi email!' });
            }

            // 🔹 Cấu hình transporter của nodemailer
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: EMAIL_USER,
                    clientId: CLIENT_ID,
                    clientSecret: CLIENT_SECRET,
                    refreshToken: REFRESH_TOKEN,
                    accessToken: accessToken.token,
                },
            });

            // 🔹 Gửi email OTP
            const mailOptions = {
                from: `"Hệ Thống Xác Minh" <${EMAIL_USER}>`,
                to: email,
                subject: 'Mã OTP Đặt Lại Mật Khẩu',
                text: `Mã OTP của bạn là: ${otpCode}. Mã này sẽ hết hạn sau 10 phút.`,
            };

            await transporter.sendMail(mailOptions);

            return res.status(200).json({ message: 'OTP đã được gửi qua email!' });
        } catch (error) {
            console.error('Lỗi gửi OTP:', error);
            return res.status(500).json({ message: 'Lỗi server khi gửi OTP!' });
        }
    }
}

module.exports = new ControllerEmail();
