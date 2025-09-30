const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUploader(folderName = '') {
    // Crear carpeta de uploads si no existe
    const uploadPath = path.join(__dirname, '../../../uploads', folderName);
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Configuración básica de multer
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname); // extensión original (.pdf, .png, etc.)
            const baseName = path.basename(file.originalname, ext); // nombre sin extensión
            cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        }
    });


    // Crear instancia de multer con configuración simplificada
    const upload = multer({
        storage: storage,
        fileFilter: (req, file, cb) => {
            // Log para debugging
            console.log('Procesando archivo:', file.originalname);

            // Aceptar todos los archivos por ahora para debugging
            cb(null, true);
        }
    });

    // Retornar el middleware
    return (req, res, next) => {
        console.log('Iniciando proceso de upload');

        // Usar array para manejar múltiples archivos
        upload.array('files', 100)(req, res, function (err) {//aqui puedo subir hasta 100 archivos
            if (err) {
                console.error('Error en upload:', err);
                return res.status(400).json({
                    error: true,
                    message: err.message
                });
            }



            if (!req.files || req.files.length === 0) {
                // Identificar posibles causas
                let probableCause = 'No se detectaron archivos en la solicitud.';

                if (!req.headers['content-type']?.includes('multipart/form-data')) {
                    probableCause = 'El formulario no fue enviado como multipart/form-data.';
                } else if (req.body && Object.keys(req.body).length > 0) {
                    probableCause = 'Se recibieron campos de formulario, pero ningún archivo.';
                } else if (req.files && req.files.length === 0) {
                    probableCause = 'Multer procesó la solicitud pero no encontró archivos en el campo esperado.';
                }

                return res.status(400).json({
                    error: true,
                    message: 'No se han subido archivos',
                    probableCause,
                    debug: {
                        expectedField: 'files', // multer espera este campo
                        contentType: req.headers['content-type'],
                        bodyKeys: Object.keys(req.body || {}),
                        rawBody: req.body
                    }
                });
            }


            next();
        });
    };
}

module.exports = { createUploader };
