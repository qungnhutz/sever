const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ModelUser = new Schema({
    id: { type: String, default: '' },
    masinhvien: { type: String, default: '' },
    isAdmin: { type: Boolean, default: false },
    password: {type: String, default:''},
    otp: { type: String }, // Lưu mã OTP
    otpExpires: { type: Number }, // Lưu thời gian hết hạn của OTP (timestamp)
});

module.exports = mongoose.model('User', ModelUser);

