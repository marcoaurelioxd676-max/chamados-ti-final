// Firebase Admin SDK (lado do servidor).
// Usado para: validar o login do usuário (token do Firebase Authentication) e
// ler/gravar a coleção "usuarios" no Firestore (onde fica o campo "perfil").
//
// Credenciais (conta de serviço) — NUNCA envie esse arquivo para o GitHub:
//   • Local:  salve o JSON baixado do Firebase como  serviceAccountKey.json  na raiz do projeto
//   • Render: cole o conteúdo do JSON na variável de ambiente  FIREBASE_SERVICE_ACCOUNT
const fs = require('fs');
const path = require('path');

let app = null;

function lerCredenciais() {
  let json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) {
    const arquivo = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'serviceAccountKey.json');
    if (!fs.existsSync(arquivo)) {
      throw new Error(
        'Credenciais do Firebase não encontradas. Salve o arquivo serviceAccountKey.json na raiz do projeto ' +
          '(ou defina a variável FIREBASE_SERVICE_ACCOUNT). Veja o README.'
      );
    }
    json = fs.readFileSync(arquivo, 'utf8');
  }
  const cred = JSON.parse(json);
  // Algumas plataformas gravam a chave privada com "\n" literal.
  if (cred.private_key) cred.private_key = cred.private_key.replace(/\\n/g, '\n');
  return cred;
}

function admin() {
  // eslint-disable-next-line global-require
  return require('firebase-admin');
}

function getApp() {
  if (!app) {
    const fb = admin();
    app = fb.initializeApp({ credential: fb.credential.cert(lerCredenciais()) });
  }
  return app;
}

function getAuth() {
  return admin().auth(getApp());
}

function getDb() {
  return admin().firestore(getApp());
}

function serverTimestamp() {
  return admin().firestore.FieldValue.serverTimestamp();
}

// Avisa no console (sem derrubar o servidor) se algo essencial estiver faltando.
function verificarConfiguracao() {
  try {
    lerCredenciais();
  } catch (err) {
    console.warn(`\n  ⚠ ${err.message}\n  O login só funciona depois de configurar as credenciais.\n`);
  }
}

module.exports = { getAuth, getDb, serverTimestamp, verificarConfiguracao };
