const PDFLib = require('pdf-lib');
const {getDetallesDocuments, getPendingDocuments, countPendingandSigned, changeStateApplication, createDocumentSigned, getUserInfo
} = require('../models/pending.model');
const { uploadFileToStorage } = require('../services/uploadFileToStorage.service');
const signatureService = require('../../pending/services/signature.service');

async function pendingRender(req, res) {
  try {
    let pendingDocs = [];
    if (req.user && req.user.id_registro_usuarios) {
      pendingDocs = await getPendingDocuments(req.user.id_registro_usuarios);
    }
    res.render('pending/views/pendingIndex', { pendingDocs });
  } catch (error) {
    console.error('Error al renderizar index pendientes:', error);
    res.render('pending/views/pendingIndex', { pendingDocs: [], error: 'No se pudieron cargar las solicitudes pendientes.' });
  }
}
async function getPending(req, res) {
  try {
    if (!req.user || !req.user.id_registro_usuarios) {
      return res.status(400).json({
        error: true,
        message: 'Usuario no autenticado',
      });
    }
    // Lee el parámetro status
    const status = req.query.status || 'PENDIENTE';//aqui estoy 
    const resultPending = await getPendingDocuments(req.user.id_registro_usuarios, status);
    const pendingData = await countPendingandSigned(req.user.id_registro_usuarios);
    return res.render('pending/views/pendingIndex', {
      status,
      pendingDocuments: pendingData.pendientes,
      signedDocuments: pendingData.firmados,
      dateSigned: pendingData.fecha_firma,
      pendingDocs: resultPending

    });

  } catch (error) {
    console.error('Error al obtener documentos pendientes:', error);
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
    });
  }
}
async function getDetallesBySolicitud(req, res) {
    console.log('Obteniendo detalles para la solicitud:', req.params.idSolicitud);
    const { getDetallesDocuments } = require('../models/pending.model');
    const idSolicitud = req.params.idSolicitud;
    const estado = req.query.estado || 'PENDIENTE';
    
    try {
        const detalles = await getDetallesDocuments(idSolicitud, estado);
        res.json({ detalles });
    } catch (error) {
        res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
}

async function signAllDocuments(req, res) {
    try {
      const { selectedFormat, COORDS } = req.body;
      
      // Definir userInfo al inicio
      const userInfo = {
        id: req.user.id_registro_usuarios,
        selectedDocumentId: req.params.selectedDocumentId
      };

      // Validar que tengamos el formato y las coordenadas
      if (!selectedFormat || !COORDS) {
        return res.status(400).json({ 
          message: 'Formato no válido o coordenadas no definidas'
        });
      }

      const docPublicUrl = await getUserInfo(userInfo.id);
      
      // Agregar la URL de la firma a userInfo
      userInfo.signaturePublicUrl = docPublicUrl.url_firma;

      // Obtener las coordenadas específicas para el formato seleccionado
      const coords = COORDS[selectedFormat];
      if (!coords) {
        return res.status(400).json({
          message: `No se encontraron coordenadas para el formato ${selectedFormat}`
        });
      }

      // Valores por defecto para las coordenadas
      const defaultCoords = {
        pageIndex: 0,
        x: 0,
        y: 0,
        width: 160
      };

      // Combinar las coordenadas recibidas con los valores por defecto
      const finalCoords = { ...defaultCoords, ...coords };

      // Descargar la imagen de la firma
      const sigResp = await fetch(docPublicUrl.url_firma);
      if (!sigResp.ok) {
        throw new Error(`Error al descargar la firma: ${sigResp.status} ${sigResp.statusText}`);
      }
      const sigBlob = await sigResp.blob();
      const sigBytes = new Uint8Array(await sigBlob.arrayBuffer());
      const estado = req.query.estado;
      console.log('Firma descargada:', {
        tamaño: sigBytes.length,
        tipo: sigResp.headers.get('content-type'),
        coordenadas: finalCoords
      });

      // Obtener los documentos asociados a la solicitud
      const documentos = await getDetallesDocuments(req.params.selectedDocumentId, estado);
      console.log('Documentos obtenidos:', JSON.stringify(documentos, null, 2));

      if (!documentos || documentos.length === 0) {
        return res.status(404).json({ message: 'No hay documentos para firmar.' });
      }

      const resultados = [];
      
      // Procesar cada documento
      for (const doc of documentos) {
        try {
          if (!doc || !doc.url_archivo) {
            console.error('Documento sin URL válida:', doc);
            resultados.push({
              documento: doc?.nombre_original || 'Documento sin nombre',
              firmado: false,
              error: 'URL del archivo no disponible'
            });
            continue;
          }

          console.log('Procesando documento:', {
            nombre: doc.nombre_original,
            url: doc.url_archivo,
            firma: docPublicUrl.url_firma // Agregar log de la URL de la firma
          });

          // Validar formato de URL
          if (!doc.url_archivo.startsWith('http://') && !doc.url_archivo.startsWith('https://')) {
            console.error('URL de archivo inválida:', doc.url_archivo);
            resultados.push({
              documento: doc.nombre_original,
              firmado: false,
              error: 'URL del archivo inválida'
            });
            continue;
          }

          // Descargar el archivo original
          const fileResp = await fetch(doc.url_archivo);
          if (!fileResp.ok) {
            throw new Error(`Error al descargar archivo: ${fileResp.status} ${fileResp.statusText}`);
          }
          
          const fileBuffer = await fileResp.arrayBuffer();
          const pdfBytes = new Uint8Array(fileBuffer);

          // Detectar área de firma
          const signatureArea = await signatureService.detectSignatureArea(pdfBytes, selectedFormat);
          
          // Usar directamente el área detectada
          const signedPdfBytes = await signatureService.insertSignature(
            pdfBytes,
            sigBytes,
            signatureArea
          );

          const fileName = `${doc.nombre_original}-firmado.pdf`;
          
          // Guardar físicamente el archivo
          const { publicUrl } = await uploadFileToStorage(signedPdfBytes, fileName);
          
          // Crear el registro en la base de datos
          await createDocumentSigned(
              publicUrl,
              selectedFormat,
              userInfo.id,
              doc.id_registro_detalles,
              userInfo.selectedDocumentId
              
          );

          resultados.push({
            documento: doc.nombre_original,
            firmado: true,
            url: publicUrl
          });

        } catch (error) {
          console.error(`Error al procesar documento ${doc.nombre_original}:`, error);
          resultados.push({
            documento: doc.nombre_original,
            firmado: false,
            error: error.message
          });
        }
      }

      // Si todo salió bien, cambiar el estado de la solicitud
      if (resultados.every(r => r.firmado)) {
        await changeStateApplication(userInfo.selectedDocumentId);
      }

      return res.status(200).json({
        message: 'Proceso de firma completado',
        resultados
      });

    } catch (error) {
      console.error('Error general:', error);
      return res.status(500).json({
        message: 'Error al firmar documentos.',
        error: error.message
      });
    }
}

module.exports = {
  pendingRender,
  getPending,
  signAllDocuments,
  getDetallesBySolicitud,
};

