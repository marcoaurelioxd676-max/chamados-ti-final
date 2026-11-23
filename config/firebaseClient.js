// Configuração do Firebase para o NAVEGADOR (tela de login).
function obterConfig() {
  if (process.env.FIREBASE_WEB_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_WEB_CONFIG);
    } catch (err) {
      console.error("Erro ao parsear FIREBASE_WEB_CONFIG:", err);
    }
  }

  // Configuração padrão local
  return {
    apiKey: "AIzaSyA55I3Hz47V6ncy1pjXCWKUH1feO1qPuoY",
    authDomain: "chamados-ti-rbac-d94d6.firebaseapp.com",
    projectId: "chamados-ti-rbac-d94d6",
    storageBucket: "chamados-ti-rbac-d94d6.firebasestorage.app",
    messagingSenderId: "1039364995877",
    appId: "1:1039364995877:web:b027a656d513441e83b8cc"
  };
}

function configurado() {
  const cfg = obterConfig();
  return Boolean(cfg && cfg.apiKey && !cfg.apiKey.includes('COLE_AQUI'));
}

module.exports = { obterConfig, configurado };