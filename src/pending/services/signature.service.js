const tesseract = require('node-tesseract-ocr');
const PDFLib = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { fromBuffer } = require('pdf2pic');
const os = require('os'); // 🔹 carpeta temporal del sistema

class SignatureService {
  constructor() {
    this.config = {
      lang: "spa",
      oem: 1,
      psm: 6, // 🔹 modo lectura más preciso
      binary: 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe' // Ruta Tesseract en Windows
    };

    // Palabras clave que delimitan la zona de firma
    this.signaturePatterns = [
      "Atentamente",
      "Gerente General / Representante Legal",
      "Representante Legal"
    ];

    // Coordenadas por defecto y por tipo de documento
    this.signatureFormats = {
      default: {
        pageIndex: 0,
        x: 200,
        y: 120,
        width: 200,
        height: 80
      },
      GCLPPR: {
        pageIndex: 0,
        x: 200,
        y: 100,
        width: 200,
        height: 80
      }
    };
  }

  /**
   * Detecta la posición de la firma mediante OCR (última página)
   */
  async detectSignatureArea(pdfBuffer, documentType = 'default') {
    // ✅ Carpeta temporal fuera de OneDrive
    const tempDir = path.join(os.tmpdir(), 'doc_signed_temp');
    const tempFile = path.join(tempDir, `page-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // Cargar documento completo
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      const lastPageIndex = totalPages - 1;
      const page = pdfDoc.getPage(lastPageIndex);
      const pageHeight = page.getHeight();
      const pageWidth = page.getWidth();

      // Convertir la última página del PDF a imagen
      const convert = fromBuffer(pdfBuffer, {
        density: 300,
        format: "png",
        width: 1600,
        height: 2200,
        quality: 100,
        savePath: tempDir,
        saveFilename: path.basename(tempFile, '.png')
      });

      let result;
      try {
        result = await convert(totalPages); // 🔹 última página
      } catch (err) {
        console.error('⚠️ Error al convertir PDF a imagen:', err.message);
        return this.signatureFormats[documentType] || this.signatureFormats.default;
      }

      const imageBuffer = await fs.readFile(result.path);

      // Preprocesar imagen para mejorar OCR
      const enhancedImage = await sharp(imageBuffer)
        .grayscale()
        .threshold(180)
        .toBuffer();

      // OCR con Tesseract
      const text = await tesseract.recognize(enhancedImage, this.config);
      console.log('🧾 Texto OCR detectado:\n', text);

      // Normalizar texto y separar líneas
      const normalize = s =>
        s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

      const lines = text.split('\n').map(l => normalize(l)).filter(Boolean);

      let atenY = -1;
      let gerenteY = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ATENTAMENTE')) atenY = i;
        if (line.includes('GERENTE') || line.includes('REPRESENTANTE')) gerenteY = i;
      }

      // Si no detecta anclas, usar coordenadas por defecto
      if (atenY === -1 || gerenteY === -1) {
        console.log('⚠️ No se detectaron marcadores, usando coordenadas por defecto.');
        return this.signatureFormats[documentType] || this.signatureFormats.default;
      }

      // Calcular posición media
      const lineHeight = pageHeight / lines.length;
      const middleY = ((atenY + gerenteY) / 2) * lineHeight;

      // 🔹 Ajuste fino para subir la firma un poco (en puntos PDF)
      const verticalOffset = 100;

      const coords = {
        pageIndex: lastPageIndex,
        x: (pageWidth - 200) / 2, // centrado horizontalmente
        y: Math.min(pageHeight - middleY + verticalOffset, pageHeight - 100),
        width: 200,
        height: 80
      };

      console.log('📍 Coordenadas detectadas (ajustadas):', coords);
      return coords;

    } catch (error) {
      console.error('❌ Error detectando área de firma:', error);
      return this.signatureFormats[documentType] || this.signatureFormats.default;
    } finally {
      // Limpieza de archivo temporal
      try {
        await fs.unlink(tempFile);
      } catch { }
    }
  }

  /**
   * Inserta la firma en el PDF
   */
  async insertSignature(pdfBuffer, signatureBuffer, coords) {
    try {
      if (!coords || typeof coords.pageIndex === 'undefined') {
        throw new Error('Coordenadas inválidas para insertar firma.');
      }

      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const page = pdfDoc.getPage(coords.pageIndex);

      // Procesar la imagen de la firma
      const processedSignature = await sharp(signatureBuffer)
        .resize(coords.width, coords.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();

      const signature = await pdfDoc.embedPng(processedSignature);

      // Dibujar la firma
      page.drawImage(signature, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      });

      console.log(`✅ Firma insertada correctamente en X:${coords.x}, Y:${coords.y}`);
      return await pdfDoc.save();

    } catch (error) {
      console.error('❌ Error insertando firma:', error);
      throw error;
    }
  }
}

module.exports = new SignatureService();
