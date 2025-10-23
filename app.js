require("dotenv").config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const port = 3000;
const path = require('path');
const masiveRouter = require('./src/masiveSign/routes/masivesign.route.js');
const singRouter = require('./src/sign/routes/sign.route.js');
const authRouter = require ('./src/auth/routes/auth.route.js')
const indexRouter = require ('./src/app/routes/index.route.js')
const pendingRouter = require('./src/pending/routes/pending.route.js');
const { authenticateToken } = require('./src/app/middleware/auth.middleware.js');
const userProfileRouter = require('./src/userProfile/routes/userProfile.route.js');
const cookieParser = require("cookie-parser");




app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

// Motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('auth/views/auth');
});

app.use('/api/index', authenticateToken, indexRouter); 
app.use('/api/auth', authRouter);  
app.use('/api/masivesign', authenticateToken, masiveRouter);
app.use('/api/sign', authenticateToken, singRouter);
app.use('/api/pending', authenticateToken, pendingRouter);
app.use('/api/userProfile', authenticateToken, userProfileRouter);
app.use('/uploads', authenticateToken, express.static(path.join(__dirname, './uploads')));
 
app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});