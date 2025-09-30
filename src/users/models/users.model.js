//CADA MODELO ESTA REFERENCIADO O RELACIONADO A UNA TABL EN ESPECIFICO
const sql = require('mssql');
const config = require('../../../db.js');

async function getUserById(userId) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM Usuario WHERE id_registro_usuarios = @userId');
        return result.recordset[0];
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
    }
}

module.exports = {
    getUserById
};