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
        
        // Validar usuario y documento
        if (!req.user?.id_registro_usuarios) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const userInfo = {
            id: req.user.id_registro_usuarios,
            selectedDocumentId: req.params.selectedDocumentId
        };

        // Obtener información de firma del usuario
        const docPublicUrl = await getUserInfo(userInfo.id);
        if (!docPublicUrl?.url_firma) {
            return res.status(400).json({ message: 'URL de firma no encontrada' });
        }

        // Modificar la parte de obtención de firma
        let firmaUrl;
        try {
            const rawUrl = docPublicUrl.url_firma;
            
            // Limpiar y validar la URL
            const cleanUrl = rawUrl.trim().replace(/\\/g, '/');
            firmaUrl = cleanUrl.startsWith('http') 
                ? new URL(cleanUrl)
                : new URL(`/uploads/${path.basename(cleanUrl)}`, 'http://localhost:3000');

            console.log('Intentando obtener firma desde:', firmaUrl.toString());

            // Obtener la imagen directamente con las opciones correctas
            const sigResponse = await fetch(firmaUrl.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'image/png,image/jpeg,image/*;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                redirect: 'follow', // Seguir redirecciones
                follow: 5 // Máximo de redirecciones
            });

            // Verificar la respuesta
            if (!sigResponse.ok) {
                console.error('Error en la respuesta:', {
                    status: sigResponse.status,
                    statusText: sigResponse.statusText,
                    headers: Object.fromEntries(sigResponse.headers.entries())
                });
                throw new Error(`Error al obtener la firma: ${sigResponse.status} ${sigResponse.statusText}`);
            }

            // Verificar el tipo de contenido
            const contentType = sigResponse.headers.get('content-type');
            if (!contentType || !contentType.match(/^image\/(png|jpeg|jpg|gif)/i)) {
                console.error('Tipo de contenido incorrecto:', {
                    received: contentType,
                    url: firmaUrl.toString()
                });
                throw new Error(`Tipo de contenido no válido para firma: ${contentType}`);
            }

            // Obtener el buffer de la imagen
            const sigBuffer = await sigResponse.arrayBuffer();
            
            if (!sigBuffer || sigBuffer.byteLength === 0) {
                throw new Error('La firma está vacía');
            }

            console.log('Firma obtenida correctamente:', {
                contentType,
                size: sigBuffer.byteLength,
                url: firmaUrl.toString()
            });

            // Continuar con el procesamiento de documentos...
            const documentos = await getDetallesDocuments(userInfo.selectedDocumentId, 'PENDIENTE');
            if (!documentos?.length) {
                return res.status(404).json({ message: 'No hay documentos para firmar.' });
            }

            const resultados = [];
        
            // Procesar cada documento
            for (const doc of documentos) {
                try {
                    if (!doc.url_archivo) {
                        throw new Error('URL del archivo no disponible');
                    }

                    // Asegurarse que la URL es absoluta
                    const pdfUrl = new URL(doc.url_archivo, 'http://localhost:3000').toString();
                    
                    // Descargar PDF con validación de tipo
                    const pdfResponse = await fetch(pdfUrl, {
                        headers: {
                            'Accept': 'application/pdf'
                        }
                    });

                    if (!pdfResponse.ok || !pdfResponse.headers.get('content-type').includes('pdf')) {
                        throw new Error(`Error al descargar PDF: Tipo de contenido inválido`);
                    }

                    const pdfBuffer = await pdfResponse.arrayBuffer();

                    // Validar que es un PDF válido
                    try {
                        await PDFLib.PDFDocument.load(pdfBuffer);
                    } catch (error) {
                        throw new Error('El archivo no es un PDF válido');
                    }

                    // Detectar área e insertar firma
                    const signatureArea = await signatureService.detectSignatureArea(
                        new Uint8Array(pdfBuffer), 
                        selectedFormat
                    );

                    const signedPdfBytes = await signatureService.insertSignature(
                        new Uint8Array(pdfBuffer),
                        new Uint8Array(sigBuffer),
                        signatureArea
                    );

                    // Subir documento firmado
                    const fileName = `${doc.nombre_original}-firmado.pdf`;
                    const { publicUrl } = await uploadFileToStorage(signedPdfBytes, fileName);

                    // Registrar documento firmado
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

            // Actualizar estado si todo fue exitoso
            if (resultados.every(r => r.firmado)) {
                await changeStateApplication(userInfo.selectedDocumentId);
            }

            return res.status(200).json({
                message: 'Proceso de firma completado',
                resultados
            });

        } catch (error) {
            console.error('Error detallado al procesar firma:', {
                error: error.message,
                stack: error.stack,
                url: firmaUrl?.toString(),
                originalUrl: docPublicUrl?.url_firma
            });
            
            return res.status(500).json({
                message: 'Error al procesar firma',
                error: error.message,
                details: {
                    url: firmaUrl?.toString(),
                    originalUrl: docPublicUrl?.url_firma,
                    message: error.message
                }
            });
        }

    } catch (error) {
        console.error('Error general:', error);
        return res.status(500).json({
            message: 'Error al firmar documentos',
            error: error.message,
            details: error.stack
        });
    }
}

module.exports = {
  pendingRender,
  getPending,
  signAllDocuments,
  getDetallesBySolicitud,
};

