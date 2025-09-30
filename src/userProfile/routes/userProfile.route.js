const express = require('express');
const router = express.Router();
const { createUploader } = require('../../masiveSign/middleware/fileUpload.middleware.js');
const { uploadSign} = require('../controllers/userProfile.controller.js');
const { userProfileRender } = require('../controllers/userProfile.controller');

router.get('/', userProfileRender);
router.post('/upload-signature',createUploader(), uploadSign);

module.exports = router;