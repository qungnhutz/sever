const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BookSchema = new Schema({
    masach: { type: String, default: '' },
    tensach: { type: String, default: '' },
    img: { type: String, default: '' },
    tacgia: { type: String, default: '' },
    nhaxuatban: { type: String, default: '' },
    phienban: { type: String, default: '' },
    madanhmuc: { type: String, required: true },
    namxb: { type: String, default: '' },
    mota: { type: String, default: '' },
    ngaycapnhat: { type: Date, default: Date.now },
    vitri: [{
        mavitri: { type: String, required: true },  // Mã vị trí
        soluong: { type: Number, default: 1, min: 0 }, // Số lượng sách tại vị trí đó
        soluongmuon: { type: Number, default: 0, min: 0 } // Số lượng đã mượn
    }],
    pages: { type: Number, default: 0, min: 0 }, // Số trang
    price: { type: Number, default: 0, min: 0 } // Giá sách
});


// Tạo Model từ Schema
const ModelBook = mongoose.model('Book', BookSchema);

module.exports = ModelBook;
