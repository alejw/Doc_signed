//Aqui se validaria el token JWT en las peticiones
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req?.cookies?.token; // Asumiendo que el token se envía en una cookie llamada 'token'     

        if (!token){
          return res.redirect('/'); // Redirige al usuario a la página de login u otra página
        } 

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
        req.user = user; // Agrega la información del usuario al objeto de la solicitud
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next(); // Llama al siguiente middleware o ruta{}
    });
    
}

module.exports = { authenticateToken };
