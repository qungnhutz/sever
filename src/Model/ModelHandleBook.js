const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BorrowingFormS = new Schema({
    maphieumuon: { type: String, required: true },
    masinhvien: { type: String, required: true }, // Mã sinh viên
    masach: { type: String, required: true }, // Mã sách
    mavitri: { type: String, required: true },
    soluong: { type: Number, required: true }, // Số lượng mượn
    ngaymuon: { type: Date, default: Date.now }, // Ngày mượn
    ngayhentra: { type: Date, required: true }, // Ngày hẹn trả
    giahan: { type: Boolean, default: false }, //xem đã gia hạn chưa
    ngaytra: { type: Date, default: null }, // Ngày thực tế trả sách
    tinhtrang: { type: Boolean, default: false } ,// Trạng thái: false (chưa trả), true (đã trả)
    confirm: { type: Boolean, default: false },// xác nhận sinh viên đến nhận sách chưa
    quahan: { type: Number, default: null }
});

module.exports = mongoose.model('BorrowingForm', BorrowingFormS);
