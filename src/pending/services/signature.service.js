const PDFLib = require('pdf-lib');
const fs = require('fs').promises;
const sharp = require('sharp');
const pdfjsLib = require('pdfjs-dist');

// Agregar al inicio de la clase, después de los requires
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');

class SignatureService {
  constructor() {
    this.signatureAnchors = {
      GCLPPR: {
        // Elementos específicos para buscar
        atentamenteText: 'Atentamente',
        nombreText: 'Nombre',
        gerenteText: 'Gerente General / Representante Legal',
        // Configuración de la firma
        offsetY: -40,     // Ajuste vertical desde "Atentamente"
        offsetX: 30,     // Ajuste horizontal desde "Atentamente"
        width: 130,       // Ancho de la firma
        height: 35        // Alto de la firma
      }
    };
  }

  async detectSignatureArea(pdfBuffer, documentType = 'default') {
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      let page = pdfDoc.getPage(0);
      let textItems = await this.getTextPositions(page);
      const config = this.signatureAnchors[documentType] || this.signatureAnchors.GCLPPR;
      
      // Buscar "Atentamente" en la primera página
      let atentamentePosition = null;
      let pageIndex = 0;

      for (const item of textItems) {
        if (item.str.trim() === config.atentamenteText) {
          atentamentePosition = item;
          break;
        }
      }

      // Si no se encuentra en la primera página, buscar en la última
      if (!atentamentePosition && pdfDoc.getPageCount() > 1) {
        pageIndex = 0; // Volvemos a la primera página
        page = pdfDoc.getPage(pageIndex);
        textItems = await this.getTextPositions(page);
        
        for (const item of textItems) {
          if (item.str.trim() === config.atentamenteText) {
            atentamentePosition = item;
            break;
          }
        }
      }

      if (!atentamentePosition) {
        console.warn('⚠️ No se encontró "Atentamente" en ninguna página');
        return this.getDefaultPosition(page.getWidth(), page.getHeight());
      }

      // Usar los offsets definidos en el constructor
      const signatureX = atentamentePosition.x + config.offsetX;
      const signatureY = atentamentePosition.y + config.offsetY;

      console.log('Posición calculada para la firma:', {
        x: signatureX,
        y: signatureY,
        offsetsUsados: {
          x: config.offsetX,
          y: config.offsetY
        },
        atentamentePos: {
          x: atentamentePosition.x,
          y: atentamentePosition.y
        }
      });

      return {
        pageIndex: 0,
        x: signatureX,
        y: signatureY,
        width: config.width,
        height: config.height
      };

    } catch (error) {
      console.error('❌ Error detectando área de firma:', error);
      throw error;
    }
  }

  async getTextPositions(page) {
    try {
        const pageBuffer = await page.doc.save();
        const pdf = await pdfjsLib.getDocument({data: pageBuffer}).promise;
        // Usamos el índice 1 ya que pdf.js usa índices basados en 1
        const pdfPage = await pdf.getPage(1);
        const textContent = await pdfPage.getTextContent();
        
        // Imprimir todos los elementos de texto para debugging
        console.log('Elementos de texto encontrados:');
        textContent.items.forEach(item => {
            console.log(`"${item.str}" en posición Y: ${item.transform[5]}`);
        });
        
        // Ordenar los elementos por posición Y (de abajo hacia arriba)
        return textContent.items
            .map(item => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width || 0,
                height: item.height || 0
            }))
            .sort((a, b) => b.y - a.y);
    } catch (error) {
        console.error('Error detallado obteniendo posiciones de texto:', error);
        console.log('Contenido del PDF:', page);
        return [];
    }
  }

  getDefaultPosition(pageWidth, pageHeight) {
    return {
      pageIndex: 0,
      x: (pageWidth - 120) / 2,
      y: pageHeight / 3,
      width: 120,
      height: 35
    };
  }

  async extractPageText(page) {
    try {
      // Convertir la página a ArrayBuffer
      const pageBuffer = await page.doc.save();
      
      // Cargar el documento con pdf.js
      const pdf = await pdfjsLib.getDocument({data: pageBuffer}).promise;
      const pdfPage = await pdf.getPage(page.getIndex() + 1);
      
      // Extraer el contenido de texto
      const textContent = await pdfPage.getTextContent();
      
      // Unir todos los elementos de texto
      const text = textContent.items
        .map(item => item.str)
        .join('\n');

      return text;
    } catch (error) {
      console.error('Error extrayendo texto:', error);
      return '';
    }
  }

  async insertSignature(pdfBuffer, signatureBuffer, coords) {
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
      const page = pdfDoc.getPage(coords.pageIndex);

      // Procesar la firma para mejor calidad y transparencia
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
