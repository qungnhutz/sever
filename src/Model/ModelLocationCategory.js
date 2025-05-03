const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const LocationCategorySchema = new Schema({
    mavitri: { type: String, default: '' },
    coso: { type: String, default: '' },
    soke: { type: Number, default: 0 }
});

// Tạo Model từ Schema
const LocationCategory = mongoose.model('LocationCategory', LocationCategorySchema);

module.exports = LocationCategory;
