const express = require('express');
const router = express.Router();
const ControllerEmail = require('../Controller/ControllerEmail');

router.post('/api/sendOTP', ControllerEmail.sendOTP); 
module.exports = router;