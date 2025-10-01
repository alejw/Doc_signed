// src/auth/services/ldapAuth.service.js
const ActiveDirectory = require('activedirectory2');


async function credentialsAreCorrect(username, password) {
  const config = {
    url: `ldap://${process.env.LDAP_SERVER}`,
    baseDN: process.env.LDAP_BASE_DN,
    attributes: { 
      user: ['dn', 'cn', 'mail', 'givenName', 'sn', 'memberOf'] 
    }
  };

  const userUPN = username.includes('@') 
    ? username 
    : `${username}@${process.env.AD_DOMAIN}`;

  try {
    // Crear instancia de AD con las credenciales del usuario
    const ad = new ActiveDirectory({
      ...config,
      username: userUPN,
      password: password
    });

    return new Promise((resolve) => {
      ad.authenticate(userUPN, password, (err, auth) => {
        if (err) {
          console.error("Error de autenticación:", {
            message: err.message,
            code: err.code || 'N/A'
          });
          return resolve(false);
        }

        console.log(`Usuario ${userUPN} autenticado: ${auth}`);
        resolve(auth);
      });
    });
  } catch (error) {
    console.error("Error creando instancia AD:", error);
    return false;
  }
}

async function findUserInAD(username, password) {
  try {
    const userUPN = username.includes('@') 
      ? username 
      : `${username}@${process.env.AD_DOMAIN}`;

    const config = {
      url: `ldap://${process.env.LDAP_SERVER}`,
      baseDN: process.env.LDAP_BASE_DN,
      username: userUPN,
      password: password,
      attributes: { 
        user: ['dn', 'cn', 'mail', 'givenName', 'sn', 'memberOf'] 
      }
    };

    const ad = new ActiveDirectory(config);

    return new Promise((resolve, reject) => {
      ad.findUser(username, (err, user) => {
        if (err) {
          console.error("Error buscando usuario:", err);
          return reject(err);
        }
        if (!user) {
          console.log(`Usuario ${username} no encontrado en AD`);
          return resolve(null);
        }

        console.log('Usuario encontrado en AD:', user.cn);
        resolve(user);
      });
    });
  } catch (error) {
    console.error("Error en findUserInAD:", error);
    throw error;
  }
}

module.exports = { credentialsAreCorrect, findUserInAD };
