const { saveSolicitud, saveDetalles } = require('../models/request.model');
const { getPendingDocuments } = require('../../pending/models/pending.model');


async function masiveSignRender(req, res) {
  const resultPending = await getPendingDocuments(req.user.id_registro_usuarios);
  return res.render('masiveSign/views/masiveSignIndex', {
    pendingDocuments: resultPending.length,

  });
}

async function uploadFiles(req, res) {

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'No se subieron archivos',
      });
    }

    // Procesar archivos con URL pública
    const processedFiles = req.files.map(file => {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      return {
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl, // ✅ URL lista para guardar en BD
      };
    });
    const tipo_solicitud = 'masiva'
    const idSolicitud = await saveSolicitud(req.user.id_registro_usuarios, req.body.representanteLegal, tipo_solicitud, req.body.comments || '');

    for (let index = 0; index < processedFiles.length; index++) {
      await saveDetalles(idSolicitud, processedFiles[index].url, req.body.formato);
    }

      return res.status(200).json({
        error: false,
        message: 'Archivos cargados exitosamente',
        files: processedFiles,
        totalFiles: processedFiles.length,
    });    

  } catch (error) {
    console.error('❌ Error en uploadFiles:', error);
    return res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
      debug: {
        errorMessage: error.message,
        errorStack: error.stack,
      }
    });
  }
}





module.exports = {
  masiveSignRender,
  uploadFiles,
};