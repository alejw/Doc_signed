const fs = require('fs').promises;
const path = require('path');

async function uploadFileToStorage(fileBuffer, fileName) {
    try {
        // Crear carpeta de documentos firmados si no existe
        const uploadPath = path.join(__dirname, '../../../uploads/signed');
        try {
            await fs.access(uploadPath);
        } catch {
            await fs.mkdir(uploadPath, { recursive: true });
        }

        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);
        const uniqueFileName = `${baseName}-signed-${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadPath, uniqueFileName);

        // Guardar el archivo
        await fs.writeFile(filePath, fileBuffer);

        // Construir la URL completa con el servidor
        const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
        const publicUrl = `${serverUrl}/uploads/signed/${uniqueFileName}`;

        return {
            publicUrl,
            filePath
        };
    } catch (error) {
        console.error('Error al guardar el archivo firmado:', error);
        throw new Error('Error al guardar el archivo firmado');
    }
}

module.exports = { uploadFileToStorage };