const sql = require('mssql');
const config = require('../../../db.js');

console.log('informacion de req.user:');

async function saveSolicitud(id_solicitante, id_firmante, tipo_solicitud, comentarios) {
    try {
        const pool = await config.poolPromise;//Aqui obtengo el pool de conexiones
        const result = await pool.request()//aqui creo una nueva solicitud
            .input('id_solicitante', sql.Int, id_solicitante)
            .input('id_firmante', sql.Int, id_firmante)
            .input('tipo_solicitud', sql.VarChar, tipo_solicitud)
            //.input('fechaSolicitud', sql.DateTime, new Date())
            .input('comentarios', sql.VarChar, comentarios)
            .query('INSERT INTO Solicitudes (id_solicitante, id_firmante, tipo_solicitud, fecha_solicitud, desc_comentario) VALUES (@id_solicitante, @id_firmante, @tipo_solicitud, GETDATE(), @comentarios); SELECT SCOPE_IDENTITY() AS id;');

        return result.recordset[0].id;
        

    } catch (error) {
        console.error('Error al guardar la solicitud:', error);
        throw error;
    }

}

async function saveDetalles(idSolicitud, url, formato) {
    try {
        const pool = await config.poolPromise;
        return pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .input('url', sql.VarChar, url)
            .input('formato', sql.VarChar, formato)
            //.input('fechaSolicitud', sql.DateTime, new Date())
            .query('INSERT INTO Detalles_solicitudes (id_solicitud, fecha_solicitud, url_archivos, tipo_documento) VALUES (@idSolicitud, GETDATE(), @url, @formato)');
    } catch (error) {
        console.error('Error al guardar los detalles:', error);
        throw error;
    }
}



module.exports = { saveSolicitud, saveDetalles };