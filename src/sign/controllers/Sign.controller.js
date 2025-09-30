const { getPendingDocuments } = require('../../pending/models/pending.model');

async function SignRender(req, res) {
  const resultPending = await getPendingDocuments(req.user.id_registro_usuarios);

  res.render('sign/views/signIndex', {
    pendingDocuments: resultPending.length,
  });
}

module.exports = {
  SignRender
};