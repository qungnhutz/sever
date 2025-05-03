const express = require('express');
const router = express.Router();
const ControllerBookGenre = require('../Controller/ControllerBookGenre');

router.post('/api/addCategory', ControllerBookGenre.addCategory);         // Thêm danh mục
router.delete('/api/deleteCategory', ControllerBookGenre.deleteCategory);  // Xóa danh mục
router.get('/api/getAllCategories', ControllerBookGenre.getAllCategories);     // Lấy tất cả danh mục
router.get('/api/getBooksByCategory', ControllerBookGenre.getBooksByCategory); // Lấy sách theo danh mục
router.put('/api/updateCategory', ControllerBookGenre.updateCategory);
router.get('/api/searchCategories', ControllerBookGenre.searchCategories);

module.exports = router;
