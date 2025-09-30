const express = require('express');
const { createUploader } = require('../middleware/fileUpload.middleware.js');
const { masiveSignRender, uploadFiles} = require('../controllers/masiveSign.controller');
const router = express.Router();


router.get('/', masiveSignRender);
router.post('/', createUploader(), uploadFiles);


module.exports = router;