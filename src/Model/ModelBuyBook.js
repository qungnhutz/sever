const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BuyBookSchema = new Schema({
    maphieumua: { type: String, default: '' },
    masach: { type: String, default: '' },
    soluong: { type: Number, default: '' },
    dongia: { type: Number, default: '' },
    thanhtien: { type: Number, default: 0 },
    mavitri: { type: String, default: '' }
});

// Tạo Model từ Schema
const ModelBuyBook = mongoose.model('BuyBook', BuyBookSchema);

module.exports = ModelBuyBook;
