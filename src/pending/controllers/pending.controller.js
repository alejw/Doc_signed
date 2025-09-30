const { getPendingDocuments, countPendingandSigned } = require('../models/pending.model');



async function pendingRender(req, res) {
  try {
    let pendingDocs = [];
    if (req.user && req.user.id_registro_usuarios) {
      pendingDocs = await getPendingDocuments(req.user.id_registro_usuarios);
    }
    console.log(pendingDocs); 
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
      pendingDocs: resultPending,
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
  const { getDetallesBySolicitud } = require('../models/pending.model');
  const idSolicitud = req.params.idSolicitud;
  try {
    const detalles = await getDetallesBySolicitud(idSolicitud);
    res.json({ detalles });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error interno del servidor' });
  }
}

async function signAllDocuments({ uploadedFiles, signatureBlobUrl, drewOnCanvas, signatureCanvas, selectedFormat, COORDS }) {
  // Validaciones iniciales
  if (!selectedFormat || !COORDS[selectedFormat]) {
    throw new Error('Selecciona un formato para aplicar coordenadas.');
  }
  if (!uploadedFiles || !uploadedFiles.length) {
    throw new Error('No hay archivos para firmar.');
  }

  // Obtener bytes de la firma
  let sigBytes;
  if (signatureBlobUrl) {
    const res = await fetch(signatureBlobUrl);
    const blob = await res.blob();
    sigBytes = new Uint8Array(await blob.arrayBuffer());
  } else if (drewOnCanvas && signatureCanvas && !isCanvasBlank(signatureCanvas)) {
    const ab = toArrayBuffer(dataURLFromCanvas(signatureCanvas));
    sigBytes = new Uint8Array(ab);
  } else {
    throw new Error('No hay firma. Dibuja o carga una imagen.');
  }

  const coords = COORDS[selectedFormat];
  const signedOutputs = [];
  const skipped = [];

  for (const f of uploadedFiles) {
    try {
      let pdfBytes;
      if (isPdf(f)) {
        pdfBytes = new Uint8Array(await blobToArrayBuffer(f));
      } else if (isImage(f)) {
        // Convertir imagen a PDF
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const bytes = new Uint8Array(await blobToArrayBuffer(f));
        let img;
        if (/png$/i.test(f.type) || /\.png$/i.test(f.name)) {
          img = await pdfDoc.embedPng(bytes);
        } else {
          img = await pdfDoc.embedJpg(bytes);
        }
        const imgWidth = img.width;
        const imgHeight = img.height;
        const page = pdfDoc.addPage([imgWidth, imgHeight]);
        page.drawImage(img, { x: 0, y: 0, width: imgWidth, height: imgHeight });
        pdfBytes = await pdfDoc.save();
      } else if (isOffice(f)) {
        skipped.push(`${f.name} (Office) — convierte a PDF antes de firmar`);
        continue;
      } else {
        skipped.push(`${f.name} (formato no soportado)`);
        continue;
      }

      // Firmar el PDF
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageIndex = Math.min(coords.pageIndex ?? 0, pdfDoc.getPageCount() - 1);
      const page = pdfDoc.getPage(pageIndex);

      let sigImage;
      try {
        sigImage = await pdfDoc.embedPng(sigBytes);
      } catch {
        sigImage = await pdfDoc.embedJpg(sigBytes);
      }

      const desiredWidth = coords.width || 160;
      const scale = desiredWidth / sigImage.width;
      const drawWidth = desiredWidth;
      const drawHeight = sigImage.height * scale;

      const x = coords.x || 0;
      const yTop = coords.y || 0;
      const y = page.getHeight() - yTop - drawHeight;

      page.drawImage(sigImage, { x, y, width: drawWidth, height: drawHeight, opacity: 1 });

      const signed = await pdfDoc.save();
      const outName = f.name.replace(/\.(pdf|png|jpe?g)$/i, '') + '-firmado.pdf';
      signedOutputs.push({ name: outName, bytes: signed });
    } catch (err) {
      console.error('Error firmando', f.name, err);
      skipped.push(`${f.name} (error: ${err.message})`);
    }
  }

  return { signedOutputs, skipped };
}



module.exports = {
  pendingRender,
  getPending,
  signAllDocuments,
  getDetallesBySolicitud
};

