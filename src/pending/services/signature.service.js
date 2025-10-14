const PDFLib = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class SignatureService {
  constructor() {
    // Definir puntos de anclaje y offsets
    this.anchorPoints = {
      GCLPPR: {
        searchText: 'Nombre',  // Cambiamos el punto de anclaje a "Nombre"
        offsetX: 0,           // Centrado horizontalmente
        offsetY: 20,          // 20 puntos arriba de la línea
        width: 120,          // Ancho más reducido
        height: 35           // Alto ajustado
      },
      default: {
        // Mantener configuración por defecto como respaldo
        searchText: 'Atentamente',
        offsetX: 0,
        offsetY: -30,
        width: 150,
        height: 40
      }
    };
  }

  async detectSignatureArea(pdfBuffer, documentType = 'default') {
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
      const { width: pageWidth, height: pageHeight } = lastPage.getSize();
      
      // Obtener el texto de la página
      const text = await this.extractTextFromPage(lastPage);
      
      // Configuración específica del documento
      const config = this.anchorPoints[documentType] || this.anchorPoints.default;
      
      // Buscar punto de anclaje
      const anchorPosition = await this.findAnchorPosition(lastPage, config.searchText);
      
      if (!anchorPosition) {
        console.log('⚠️ Texto de anclaje no encontrado, usando posición por defecto');
        return {
          pageIndex: pdfDoc.getPageCount() - 1,
          x: (pageWidth - config.width) / 2,
          y: 150,
          width: config.width,
          height: config.height
        };
      }

      // Calcular posición final de la firma
      const signaturePosition = {
        pageIndex: pdfDoc.getPageCount() - 1,
        x: anchorPosition.x + config.offsetX,
        y: anchorPosition.y + config.offsetY,
        width: config.width,
        height: config.height
      };

      console.log('📍 Posición de firma calculada:', signaturePosition);
      return signaturePosition;

    } catch (error) {
      console.error('❌ Error detectando área de firma:', error);
      throw error;
    }
  }

  async findAnchorPosition(page, searchText) {
    // Implementación básica - pdf-lib no proporciona directamente posiciones de texto
    // Aquí podrías implementar la lógica de búsqueda de texto usando operadores de PDF
    const { width, height } = page.getSize();
    
    // Por ahora, retornamos una posición estimada
    return {
      x: width / 2 - 75, // Centrado
      y: height / 3     // Aproximadamente donde suele estar "Atentamente"
    };
  }

  async extractTextFromPage(page) {
    // Esta función se puede implementar más adelante usando pdf-text-extract o pdfjs-dist
    // Por ahora retornamos null ya que pdf-lib no proporciona esta funcionalidad
    return null;
  }

  async insertSignature(pdfBuffer, signatureBuffer, coords) {
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const page = pdfDoc.getPage(coords.pageIndex);

      // Procesar la firma para mejor calidad
      const processedSignature = await sharp(signatureBuffer)
        .resize(coords.width, coords.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .sharpen()
        .gamma(1.1)
        .png()
        .toBuffer();

      const signature = await pdfDoc.embedPng(processedSignature);

      page.drawImage(signature, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      });

      return await pdfDoc.save();

    } catch (error) {
      console.error('❌ Error insertando firma:', error);
      throw error;
    }
  }
}

module.exports = new SignatureService();
