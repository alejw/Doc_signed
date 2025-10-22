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
                CASE 
                    WHEN s.estado_solicitud = 'FIRMADO' THEN 
                        (SELECT TOP 1 fecha_firma 
                         FROM Documentos_Firmados 
                         WHERE id_solicitud = s.id_registro_solicitud)
                    ELSE s.fecha_solicitud
                END as fecha_mostrar,
                u.nombre_usuario,
                u.cedula,
                s.desc_comentario
                FROM solicitudes AS s
                JOIN Usuario AS u
                ON s.id_solicitante = u.id_registro_usuarios
                WHERE s.id_firmante = @userId AND s.estado_solicitud = @status
            `);
        return result.recordset;
    } catch (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }
}

async function getDetallesDocuments(idSolicitud, estado) {
    try {
        const pool = await config.poolPromise;
        let query;
        if (estado === 'FIRMADO') {
            query = `
                SELECT 
                    df.id_detalle_firmado,
                    df.id_solicitud,
                    df.id_detalle,
                    sd.fecha_solicitud,
                    df.url_archivo_firmado as url_archivo,
                    df.fecha_firma,
                    ds.tipo_documento as nombre_original,  -- Agregamos el nombre original
                    'FIRMADO' as estado_documento
                FROM Documentos_Firmados df
                INNER JOIN solicitudes sd ON df.id_solicitud = sd.id_registro_solicitud
                INNER JOIN Detalles_solicitudes ds ON df.id_detalle = ds.id_registro_detalles
                WHERE df.id_solicitud = @idSolicitud
            `;
        } else {
            query = `
                SELECT 
                    id_registro_detalles,
                    id_solicitud,
                    fecha_solicitud,
                    url_archivos as url_archivo,  -- URL del documento original
                    tipo_documento as nombre_original,
                    'PENDIENTE' as estado_documento
                FROM Detalles_solicitudes 
                WHERE id_solicitud = @idSolicitud
            `;
        }

        const result = await pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .query(query);

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

async function createDocumentSigned(url, formato, idFirmante, idDetalleSolicitud,idSolicitud) {
    try {
        console.log('Creando documento firmado:', {
            url,
            tipo_documento: formato,
            idFirmante,
            idDetalleSolicitud,
            idSolicitud
        });

        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('url', sql.VarChar, url)
            .input('idFirmante', sql.Int, idFirmante)
            .input('idDetalleSolicitud', sql.Int, idDetalleSolicitud)
            .input('idSolicitud', sql.Int, idSolicitud)
            .query(`
                INSERT INTO Documentos_Firmados 
                (id_detalle, url_archivo_firmado, id_firmante, fecha_firma, id_solicitud)
                VALUES 
                (@idDetalleSolicitud, @url, @idFirmante, GETDATE(), @idSolicitud);

                SELECT SCOPE_IDENTITY() AS id_detalle_firmado;
            `);

        console.log('Documento firmado creado:', result);
        return result;
    } catch (error) {
        console.error('Error al crear documento firmado:', error);
        throw error;
    }
}

async function changeStateApplication(idSolicitud) {
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('idSolicitud', sql.Int, idSolicitud)
            .query(`
                UPDATE solicitudes 
                SET estado_solicitud = 'FIRMADO'
                WHERE id_registro_solicitud = @idSolicitud
            `);
        return result;
    } catch (error) {
        console.error('Error al actualizar estado de solicitud:', error);
        throw error;
    }
}

async function getUserInfo(id_registro_usuarios){
    try {
        const pool = await config.poolPromise;
        const result = await pool.request()
            .input('id_registro_usuarios', sql.Int, id_registro_usuarios)
            .query('SELECT * FROM Usuario WHERE id_registro_usuarios = @id_registro_usuarios');
        return result.recordset[0];
    } catch (error) {
        console.error('Error al obtener la información del usuario:', error);
        throw error;
    }
}

module.exports = {
    getPendingDocuments,
    getDetallesDocuments,
    countSolicitedDocuments,
    countPendingandSigned,
    getUserInfo,
    changeStateApplication,
    createDocumentSigned
};