const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ReaderSchema = new Schema({
    masinhvien: { type: String, default: '' },
    hoten: { type: String, default: '' },
    address: { type: String, default: '' },
    ngaysinh: { type: Date, default: '' },
    sdt: { type: String, default: '' },
    email: { type: String, default: '' },
    typereader: { type: String, default: '' }
});

const ModelReader = mongoose.model('Reader', ReaderSchema);

module.exports = ModelReader;
