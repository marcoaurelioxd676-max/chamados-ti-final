const { getAuth } = require('../config/firebase');
const { obterConfig, configurado } = require('../config/firebaseClient');
const usuarios = require('../services/usuarios');
const { COOKIE, DURACAO_MS, opcoesCookie } = require('../middlewares/auth');

// Renderiza a página de autenticação (GET /login)
exports.paginaLogin = (req, res) => {
  if (req.user && !req.query.saiu) {
    return res.redirect('/');
  }

  const firebaseConfig = obterConfig();
  return res.render('login', {
    title: 'Acesso ao Sistema',
    firebaseConfig,
    firebaseConfigurado: configurado(firebaseConfig),
    saiu: Boolean(req.query.saiu),
  });
};

// Valida o ID Token do Firebase e inicia o cookie de sessão HTTP-Only (POST /auth/session)
exports.criarSessao = async (req, res) => {
  const { idToken, nome } = req.body || {};
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'Token de autenticação não informado.' });
  }

  let tokenDecodificado;
  try {
    tokenDecodificado = await getAuth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  const prefixoEmail = (tokenDecodificado.email || '').split('@')[0];
  const nomeExibicao = String(tokenDecodificado.name || nome || prefixoEmail || 'Usuário')
    .trim()
    .slice(0, 100);

  try {
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn: DURACAO_MS });
    const perfilUsuario = await usuarios.obterOuCriar({
      uid: tokenDecodificado.uid,
      nome: nomeExibicao,
      email: tokenDecodificado.email || '',
    });

    res.cookie(COOKIE, sessionCookie, { ...opcoesCookie(req), maxAge: DURACAO_MS });
    return res.json({ ok: true, perfil: perfilUsuario.perfil, redirect: '/' });
  } catch (err) {
    console.error('[Auth] Erro ao inicializar sessão:', err);
    return res.status(500).json({
      erro: 'Erro interno ao validar credenciais no Firebase/Firestore.',
    });
  }
};

// Encerra a sessão no servidor (POST /logout)
exports.logout = (req, res) => {
  res.clearCookie(COOKIE, opcoesCookie(req));
  return res.redirect('/login?saiu=1');
};
