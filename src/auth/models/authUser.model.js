const {poolPromise} = require('../../../db.js');
const sql = require('mssql');

class AuthUserModel {
  constructor() {
    this.db = poolPromise; // conexión desde db.js
  }

  async findByUsername(username) {
    try {
      const pool = await this.db;
      const result = await pool.request()
        .input('username', sql.VarChar, username)
        .query('SELECT id_registro_usuarios, id_rol, nombre_usuario, cedula FROM Usuario WHERE nombre_usuario = @username');

      if (result.recordset.length === 0) {
        return null; // si no existe el usuario
      }

      // Retorna el usuario completo
      return result.recordset[0];
      
    } catch (error) {
      console.error('❌ Error en findByUsername:', error);
      throw error;
    }
    
  }

}

module.exports = AuthUserModel;

