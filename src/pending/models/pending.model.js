//CADA MODELO ESTA REFERENCIADO O RELACIONADO A UNA TABL EN ESPECIFICO
const sql = require('mssql');
const config = require('../../../db.js');


async function getPendingDocuments(userId, status = 'PENDIENTE') {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('status', sql.VarChar, status)
            .query(`
                SELECT s.id_registro_solicitud,
                s.id_solicitante,
                s.id_firmante,
                s.estado_solicitud,
                s.tipo_solicitud,
                s.fecha_solicitud,
                u.nombre_usuario,
                u.cedula
                FROM solicitudes AS s
                JOIN Usuario AS u
                    ON s.id_firmante = u.id_registro_usuarios
                WHERE s.id_firmante = @userId AND s.estado_solicitud = @status
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }
}

async function getDetallesBySolicitud(idSolicitud) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .query('SELECT * FROM Detalles_solicitudes WHERE id_solicitud = @idSolicitud');
        return result.recordset;
    } catch (error) {
        console.error('Error al obtener los detalles:', error);
        throw error;
    }
}

async function countPendingandSigned(userId) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    SUM(CASE WHEN estado_solicitud = 'PENDIENTE' THEN 1 ELSE 0 END) AS pendientes,
                    SUM(CASE WHEN estado_solicitud = 'FIRMADO' THEN 1 ELSE 0 END) AS firmados
                FROM solicitudes
                WHERE id_firmante = @userId
            `);
        return result.recordset[0];
    } catch (error) {
        console.error('Error al contar documentos pendientes y firmados:', error);
        throw error;
    }
}

async function countSolicitedDocuments(userId) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request() 
            .input('userId', sql.Int, userId)
            .query(`
                SELECT COUNT(*) AS totalSolicitudes
                FROM solicitudes
                WHERE id_solicitante = @userId
            `);
        return result.recordset[0].totalSolicitudes;
    } catch (error) {
        console.error('Error al contar documentos solicitados:', error);
        throw error;
    }
}

module.exports = {
    getPendingDocuments,
    getDetallesBySolicitud,
    countSolicitedDocuments,
    countPendingandSigned
};
