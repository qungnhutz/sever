const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ClearanceBooks = new Schema({
    masachthanhly: { type: String, default: '' },
    masach: { type: String, default: '' },
    soluong: { type: Number, default: 0 },
    mavitri: { type: String, default: '' },
    lydo: { type: String, default: '' },
    trangthai: { type: Boolean, default: false },
    ngaycapnhat: { type: Date, default: Date.now }
});

const ModelClearanceBooks = mongoose.model('ClearanceBooks', ClearanceBooks);

module.exports = ModelClearanceBooks;