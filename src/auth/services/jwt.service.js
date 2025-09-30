
const jwt = require('jsonwebtoken');

const generateToken = userInfo => jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: '1h' });

module.exports = { generateToken };