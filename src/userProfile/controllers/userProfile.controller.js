const { countPendingandSigned, countSolicitedDocuments } = require('../../pending/models/pending.model');
const {getUserById} = require('../../users/models/users.model');
const { updateSignUser } = require('../models/userProfile.model.js');


async function userProfileRender(req, res) {
  try {
    const pendingData = await countPendingandSigned(req.user.id_registro_usuarios);
    const getSign = await getUserById(req.user.id_registro_usuarios);
    const solicitedDocument = await countSolicitedDocuments(req.user.id_registro_usuarios);
    return res.render('userProfile/views/userProfileIndex', {
      pendingDocuments: pendingData.pendientes,
      signedDocuments: pendingData.firmados,
      solicitedDocuments: solicitedDocument,
      name: req.user.givenName + ' ' + req.user.sn,
      user: req.user.nombre_usuario,
      dni: req.user.cedula,
      urlSign: getSign.url_firma
    });

  } catch (err) {
    console.error('Error fetching user profile data:', err);
    return res.status(500).send('Internal Server Error', err);
  };

}

async function uploadSign(req, res) {

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

    const url = processedFiles[0].url;
    console.log('Archivo procesado:', processedFiles[0].url);
    const updateSign = await updateSignUser(req.user.id_registro_usuarios, url);

    return res.redirect('/api/userProfile');

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
  userProfileRender,
  uploadSign
};