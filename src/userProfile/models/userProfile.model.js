//CADA MODELO ESTA REFERENCIADO O RELACIONADO A UNA TABL EN ESPECIFICO
const sql = require('mssql');
const config = require('../../../db.js');

async function updateSignUser(userId, url) {
    try {
        const pool = await config.poolPromise;
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('url', sql.VarChar(sql.MAX), url)
            .query('UPDATE Usuario SET url_firma = @url WHERE id_registro_usuarios = @userId');
    } catch (error) {
        console.error('Error updating user signature:', error);
        throw error;
    }
}

module.exports = {
    updateSignUser
};