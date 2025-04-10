const express = require('express');
const router = express.Router();

const ControllerLocationCategory = require('../Controller/ControllerLocationCategory');
router.get('/api/getBooksByLocation', ControllerLocationCategory.getBooksByLocation);
router.delete('/api/deleteLocation', ControllerLocationCategory.deleteLocation);
router.put('/api/updateLocation', ControllerLocationCategory.updateLocation);
router.post('/api/addLocation', ControllerLocationCategory.addLocation);
router.get('/api/getAllLocations', ControllerLocationCategory.getAllLocations);
router.get('/api/getLocationByMaViTri', ControllerLocationCategory.getLocationByMaViTri);
router.get('/api/generateQRCodePerShelf', ControllerLocationCategory.generateQRCodePerShelf.bind(ControllerLocationCategory));
router.get('/api/getBookshelf', ControllerLocationCategory.getBookshelf);
module.exports = router;