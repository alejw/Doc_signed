const express = require('express');
const { SignRender } = require('../controllers/Sign.controller');
const router = express.Router();

router.get('/', SignRender);

module.exports = router;