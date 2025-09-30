const express = require('express');
const router = express.Router();
const { getPending, signAllDocuments, getDetallesBySolicitud} = require('../controllers/pending.controller');

router.get('/', getPending);
router.get('/detalles/:idSolicitud', getDetallesBySolicitud );
router.post('/', signAllDocuments);


module.exports = router;