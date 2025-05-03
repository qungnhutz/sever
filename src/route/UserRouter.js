const express = require('express');
const router = express.Router();

const ControllerUser = require('../Controller/ControllerUser');

router.get('/api/getAllUsers', ControllerUser.getAllUsers);
router.get('/api/getUserByMaSinhVien', ControllerUser.getUserByMaSinhVien);
router.post('/api/createUser', ControllerUser.createUser);
router.post('/api/verifyOTP', ControllerUser.verifyOTP);
router.put('/api/updateUser', ControllerUser.updateUser);
router.delete('/api/deleteUser', ControllerUser.deleteUser);
router.put('/api/changePassword', ControllerUser.changePassword);
router.get('/api/logout', ControllerUser.logout);
router.get('/api/getStudentFromToken', ControllerUser.getStudentFromToken);
router.post('/api/login', ControllerUser.login);
module.exports = router;
