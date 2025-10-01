// src/auth/controllers/auth.controller.js
const { credentialsAreCorrect, findUserInAD } = require('../services/ldapAuth.service');
const { generateToken} = require('../services/jwt.service');
const AuthUserModel = require('../models/authUser.model');

exports.authRender = (req, res) => {
  res.render('auth/views/auth' , { pendingDocs, user: req.user });
}; //redireccionar a la vista de login

exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
      return res.render('auth/views/auth', { //aqui renderizo la vista de login con el error
      error: 'Por favor ingrese usuario y contraseña'
    });

  try {
    const userModel = new AuthUserModel();
    const users = await userModel.findByUsername(username);

    if (!users) {
        return res.render('auth/views/auth', { //aqui renderizo la vista de login con el error
        error: 'Usuario no encontrado'
      });
    }

    //aqui llamo la funcion que valida las credenciales
    const isValid = await credentialsAreCorrect(username, password);
    if (!isValid) //si las credenciales no son validas
      return res.render('auth/views/auth', { 
      error: 'Credenciales inválidas'//entonces retorno un error 401
    });
    

    //si las credenciales son validas, llamo la funcion que captura la info del usuario
    const userInfoValid = await findUserInAD(username, password); //username trae el nombre de usuario sin el dominio
    if (!userInfoValid)//si no se encuentra info del usuario
      return res.render('auth/views/auth', { 
        error: 'No se encontró información del usuario'
      });//entonces retorno un error 401

    //aqui generaria el token JWT con la info del usuario
    const {memberOf, ...user} = userInfoValid //excluyo el atributo memberOf para no incluirlo en el token ya que es un array
  
   
    // Configuro la cookie con el token JWT
    const token = generateToken({...users, ...user});//aqui al llamar userInfoValid, el token trae toda la info del usuario
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: false, 
      maxAge: 3600000 
    }); // Configuro la cookie con el token JWT, dura 1 hora  
    

    res.redirect('/api/index'); //redireccionar a la vista principal si el login es exitoso 
 
//imprimo el token en consola para verificar que se genero correctamente
  } catch (error) {    console.error('Error en login:', error);
    return res.render('auth/views/auth', { 
      error: 'Error en el servidor, por favor intente más tarde'
    });
  }
};


// Controlador para manejar la autenticación y renderizado de vistas, este es el que recibe las peticiones del router
exports.logout = async (req, res) => {
  res.clearCookie('token'); // Limpia la cookie del token
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');// Evita el almacenamiento en caché
  res.set('Pragma', 'no-cache');// Evita el almacenamiento en caché
  res.set('Expires', '0'); // Evita el almacenamiento en caché
  res.redirect('/'); // Redirige al usuario a la página de login u otra página

}