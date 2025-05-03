const express = require('express');
const cors = require('cors');
const route = require('./route/index');
const connectDB = require('./config/connect');
const cookieParser = require('cookie-parser');
const app = express();
const port = 5000;
const bodyParser = require('body-parser');
const ModelUser = require('./Model/ModelUser');
app.use(cookieParser());
const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.1.15:3000',
];

app.use(cors({
    origin: function (origin, callback) {
        // Cho phÃ©p náº¿u origin khá»›p hoáº·c khÃ´ng cÃ³ origin (vd: tá»« Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
route(app);

connectDB();

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});