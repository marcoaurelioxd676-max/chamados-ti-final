// Acesso à coleção "usuarios" do Firestore.
// Cada documento tem como ID o uid da conta no Firebase Authentication:
//   { uid, nome, email, perfil: "user" | "tecnico" | "admin", criadoEm }
const { getDb, serverTimestamp } = require('../config/firebase');
const { PERFIS, PERFIL_PADRAO } = require('../config/constants');

const COLECAO = 'usuarios';

const ref = (uid) => getDb().collection(COLECAO).doc(uid);

function normalizar(doc) {
  const d = doc.data();
  const criado = d.criadoEm && typeof d.criadoEm.toDate === 'function' ? d.criadoEm.toDate() : null;
  return {
    uid: d.uid || doc.id,
    nome: d.nome || '',
    email: d.email || '',
    // Qualquer valor desconhecido cai para o perfil mais restrito.
    perfil: PERFIS[d.perfil] ? d.perfil : PERFIL_PADRAO,
    criadoEm: criado,
  };
}

async function buscar(uid) {
  const doc = await ref(uid).get();
  return doc.exists ? normalizar(doc) : null;
}

// Regra de primeiro acesso: se o documento ainda não existe, cria com perfil "user".
async function obterOuCriar({ uid, nome, email }) {
  const existente = await buscar(uid);
  if (existente) return existente;

  try {
    // create() falha se o documento já existir (evita sobrescrever um perfil já promovido).
    await ref(uid).create({ uid, nome, email, perfil: PERFIL_PADRAO, criadoEm: serverTimestamp() });
  } catch (err) {
    // 6 = ALREADY_EXISTS: outra requisição criou no mesmo instante.
    if (err.code !== 6 && !/already exists/i.test(err.message || '')) throw err;
  }
  return buscar(uid);
}

async function listar() {
  const snap = await getDb().collection(COLECAO).get();
  return snap.docs.map(normalizar).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function alterarPerfil(uid, perfil) {
  if (!PERFIS[perfil]) throw new Error('Perfil inválido.');
  await ref(uid).update({ perfil });
}

module.exports = { buscar, obterOuCriar, listar, alterarPerfil };
