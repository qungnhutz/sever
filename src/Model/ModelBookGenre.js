const mongoose = require('mongoose');

const BookGenreSchema = new mongoose.Schema({
    madanhmuc: {
        type: String,
        required: true,
        unique: true
    },
    tendanhmuc: {
        type: String,
        required: true
    }
}, { collection: 'BookGenre' });

module.exports = mongoose.model('BookGenre', BookGenreSchema);
