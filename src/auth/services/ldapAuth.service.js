// src/auth/services/ldapAuth.service.js
const ActiveDirectory = require('activedirectory2');


function credentialsAreCorrect(username, password) {

  const config = {
    url: `ldap://${process.env.LDAP_SERVER}`,
    baseDN: process.env.LDAP_BASE_DN,
    username: `${process.env.AD_ADMIN_USER}@${process.env.AD_DOMAIN}`,
    password: process.env.AD_ADMIN_PASSWORD,
    attributes: { user: ['dn', 'cn', 'mail', 'givenName', 'sn', 'memberOf'] }
  };

  const ad = new ActiveDirectory(config); //aqui creo una clase ActiveDirectory con la configuracion anterior

  //AQUI USO PROMESAS PARA MANEJAR LA AUTENTICACION
  return new Promise((resolve) => {
    const userUPN = username.includes('@')
      ? username
      : `${username}@${process.env.AD_DOMAIN}`;

    ad.authenticate(userUPN, password, (err, auth) => {
      if (err) {
        console.error("Error de autenticación:", err);
        return resolve(false); // en lugar de reject
      }

      if (!auth) {
        return resolve(false); // credenciales inválidas
      }

      console.log(`Usuario ${userUPN} autenticado con éxito.`);
      resolve(true); // credenciales válidas
    });
  });
}

function findUserInAD(username) {
    const config = {
    url: `ldap://${process.env.LDAP_SERVER}`,
    baseDN: process.env.LDAP_BASE_DN,
    username: `${process.env.AD_ADMIN_USER}@${process.env.AD_DOMAIN}`,
    password: process.env.AD_ADMIN_PASSWORD,
    attributes: { user: ['dn', 'cn', 'mail', 'givenName', 'sn', 'memberOf'] }
  };  


  const adg = new ActiveDirectory(config); //aqui creo una clase ActiveDirectory con la configuracion anterior


    //AQUI USO PROMESAS PARA CAPTURAR LA INFO DEL USUARIO
  return new Promise((resolve, reject) => {
    adg.findUser(username, (err, user) => { 
      if (err){
        return reject(err);
      }
      if (!user) {
        return resolve(null);
      }
          console.log('Usuario encontrado en AD:');
      resolve(user);
      
    });

  });

}

module.exports = { credentialsAreCorrect, findUserInAD };
