// src/auth/routes/auth.router.js
const express = require('express');
const { authRender, login, logout} = require('../controllers/auth.controller');
const router = express.Router();

router.get('/', authRender);    // Si quieres renderizar la vista
router.post('/login', login);       // API login con el fin de autenticar y devolver datos del usuario
router.post('/logout', logout);
module.exports = router;
