const express = require('express');
const { IndexRender } = require('../controllers/index.controller');
const router = express.Router();

router.get('/', IndexRender);


module.exports = router;