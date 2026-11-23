const { getAuth } = require('../config/firebase');
const usuarios = require('../services/usuarios');

const COOKIE = 'sessao';
const DURACAO_MS = 5 * 24 * 60 * 60 * 1000; // Validade de 5 dias

function lerCookies(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach((item) => {
    const idx = item.indexOf('=');
    if (idx < 0) return;
    const chave = item.slice(0, idx).trim();
    if (chave) {
      cookies[chave] = decodeURIComponent(item.slice(idx + 1).trim());
    }
  });
  return cookies;
}

function opcoesCookie(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
  };
}

// Middleware global que identifica o usuário autenticado via cookie de sessão Firebase
async function carregarUsuario(req, res, next) {
  req.user = null;
  res.locals.user = null;
  res.locals.isStaff = false;
  res.locals.isAdmin = false;

  const sessionCookie = lerCookies(req.headers.cookie)[COOKIE];
  if (!sessionCookie) return next();

  let decodedClaims;
  try {
    decodedClaims = await getAuth().verifySessionCookie(sessionCookie);
  } catch (err) {
    res.clearCookie(COOKIE, opcoesCookie(req));
    return next();
  }

  const dadosUsuario = await usuarios.obterOuCriar({
    uid: decodedClaims.uid,
    nome: decodedClaims.name || (decodedClaims.email || '').split('@')[0] || 'Usuário',
    email: decodedClaims.email || '',
  });

  req.user = dadosUsuario;
  res.locals.user = dadosUsuario;
  res.locals.isStaff = dadosUsuario.perfil === 'tecnico' || dadosUsuario.perfil === 'admin';
  res.locals.isAdmin = dadosUsuario.perfil === 'admin';
  return next();
}

// Protege rotas que exigem autenticação
function exigirLogin(req, res, next) {
  if (req.user) return next();
  return res.redirect('/login');
}

// Restringe acesso com base nos perfis permitidos (RBAC)
function exigirPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/login');
    if (perfisPermitidos.includes(req.user.perfil)) return next();
    return res.status(403).render('403', { title: 'Acesso não autorizado' });
  };
}

module.exports = {
  COOKIE,
  DURACAO_MS,
  lerCookies,
  opcoesCookie,
  carregarUsuario,
  exigirLogin,
  exigirPerfil,
};
