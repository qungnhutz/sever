const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BorrowingFormS = new Schema({
    maphieumuon: { type: String, required: true },
    masinhvien: { type: String, required: true },
    books: [{
        masach: { type: String, required: true },
        mavitri: { type: String, required: true },
        soluong: { type: Number, required: true },
        ngaytra: { type: Date, default: null },
        newngayhentra: { type: Date, default: null },
        tinhtrang: { type: Boolean, default: false },
        confirm: { type: Boolean, default: false },
        giahan: { type: Boolean, default: false }
    }],
    ngayhentra: { type: Date, required: true },
    ngaymuon: { type: Date, default: Date.now }
});

// Kiểm tra xem model đã tồn tại chưa, nếu có thì sử dụng model hiện tại
module.exports = mongoose.models.BorrowingForm || mongoose.model('BorrowingForm', BorrowingFormS);