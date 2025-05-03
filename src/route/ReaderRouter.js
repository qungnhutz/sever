const express = require('express');
const router = express.Router();

const ControllerReader = require('../Controller/ControllerReader');
router.delete('/api/deleteReader', ControllerReader.deleteReader);
router.put('/api/editReader', ControllerReader.editReader);
router.get('/api/getReaderByMaSinhVien', ControllerReader.getReaderByMaSinhVien);
router.post('/api/addReader', ControllerReader.addReader);
router.get('/api/getAllReaders', ControllerReader.getAllReaders);
module.exports = router;
