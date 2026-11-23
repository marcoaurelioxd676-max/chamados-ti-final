const usuarios = require('../services/usuarios');
const { PERFIS } = require('../config/constants');

// GET /admin/usuarios — Painel de Gestão de Usuários (somente admin)
exports.usuarios = async (req, res) => {
  const lista = await usuarios.listar();
  const totais = { user: 0, tecnico: 0, admin: 0 };
  lista.forEach((u) => { totais[u.perfil] += 1; });
  res.render('admin/usuarios', { title: 'Usuários', lista, totais });
};

// POST /admin/usuarios/:uid/perfil — altera o campo "perfil" do usuário
exports.alterarPerfil = async (req, res) => {
  const { uid } = req.params;
  const perfil = req.body.perfil;
  const voltar = (chave, texto) => res.redirect(`/admin/usuarios?${chave}=${encodeURIComponent(texto)}`);

  if (!PERFIS[perfil]) return voltar('erro', 'Perfil inválido.');
  if (uid === req.user.uid) {
    return voltar('erro', 'Você não pode alterar o seu próprio perfil aqui (evita ficar sem nenhum administrador).');
  }

  const alvo = await usuarios.buscar(uid);
  if (!alvo) return voltar('erro', 'Usuário não encontrado.');

  await usuarios.alterarPerfil(uid, perfil);
  return voltar('msg', `Perfil de ${alvo.nome} alterado para "${PERFIS[perfil].label}".`);
};
