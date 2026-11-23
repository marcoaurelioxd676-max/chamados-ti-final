const { Op } = require('sequelize');
const { Ticket, Category, Comment } = require('../models');
const { STATUS, PRIORIDADES } = require('../config/constants');
const { validationMessages } = require('../utils/helpers');

const include = [{ model: Category, as: 'categoria' }];

const ehStaff = (user) => user.perfil === 'tecnico' || user.perfil === 'admin';

// Regra de visualização: "user" enxerga só os próprios chamados; técnico/admin enxergam todos.
const escopo = (user) => (ehStaff(user) ? {} : { autorUid: user.uid });

const categorias = () => Category.findAll({ order: [['nome', 'ASC']] });

// Busca o chamado respeitando o escopo do perfil. Para "user", chamado de outra pessoa = 404.
async function findOr404(req, res, opts = {}) {
  const ticket = await Ticket.findOne({ where: { id: req.params.id, ...escopo(req.user) }, ...opts });
  if (!ticket) res.status(404).render('404', { title: 'Chamado não encontrado' });
  return ticket;
}

const historico = (ticket, mensagens) =>
  Comment.bulkCreate(mensagens.map((mensagem) => ({ ticketId: ticket.id, autor: 'Sistema', tipo: 'sistema', mensagem })));

// GET /tickets
exports.index = async (req, res) => {
  const { q, status, prioridade, categoria, tecnico } = req.query;
  const where = { ...escopo(req.user) };

  if (q) {
    const like = { [Op.like]: `%${q}%` };
    const or = [{ titulo: like }, { solicitante: like }, { descricao: like }];
    const idMatch = String(q).match(/^(?:CH-)?0*(\d+)$/i);
    if (idMatch) or.push({ id: Number(idMatch[1]) });
    where[Op.and] = [{ [Op.or]: or }];
  }
  if (status === 'ativos') where.status = { [Op.in]: ['aberto', 'em_andamento'] };
  else if (status && STATUS[status]) where.status = status;
  if (prioridade && PRIORIDADES[prioridade]) where.prioridade = prioridade;
  if (categoria) where.categoryId = categoria;
  if (ehStaff(req.user)) {
    if (tecnico === 'nenhum') where.tecnicoResponsavel = null;
    else if (tecnico === 'meus') where.tecnicoUid = req.user.uid;
  }

  const tickets = await Ticket.findAll({ where, include, order: [['createdAt', 'DESC']] });

  res.render('tickets/index', {
    title: 'Chamados',
    tickets,
    filtros: { q: q || '', status: status || '', prioridade: prioridade || '', categoria: categoria || '', tecnico: tecnico || '' },
    categorias: await categorias(),
  });
};

// GET /tickets/new
exports.new = async (req, res) => {
  res.render('tickets/form', {
    title: 'Novo chamado',
    ticket: { prioridade: 'media', status: 'aberto' },
    errors: [],
    isEdit: false,
    categorias: await categorias(),
  });
};

// POST /tickets — registra um novo chamado vinculando uid, nome e e-mail do usuário logado
exports.create = async (req, res) => {
  const b = req.body;
  const data = {
    titulo: (b.titulo || '').trim(),
    descricao: (b.descricao || '').trim(),
    setor: b.setor || null,
    prioridade: PRIORIDADES[b.prioridade] ? b.prioridade : 'media',
    categoryId: b.categoryId || null,
    // Metadados do autor autenticado (Firebase Auth)
    autorUid: req.user.uid,
    autorNome: req.user.nome,
    autorEmail: req.user.email,
    solicitante: req.user.nome,
    emailSolicitante: req.user.email || null,
    // Atendimento
    status: 'aberto',
    tecnicoUid: null,
    tecnicoResponsavel: null,
  };
  try {
    const ticket = await Ticket.create(data);
    await historico(ticket, [`Chamado aberto por ${ticket.autorNome}.`]);
    res.redirect(`/tickets/${ticket.id}?msg=${encodeURIComponent(`Chamado ${ticket.protocolo} criado com sucesso!`)}`);
  } catch (err) {
    const errors = validationMessages(err);
    if (!errors) throw err;
    res.status(422).render('tickets/form', {
      title: 'Novo chamado',
      ticket: data,
      errors,
      isEdit: false,
      categorias: await categorias(),
    });
  }
};

// GET /tickets/:id
exports.show = async (req, res) => {
  const ticket = await findOr404(req, res, {
    include: [...include, { model: Comment, as: 'comentarios' }],
    order: [[{ model: Comment, as: 'comentarios' }, 'createdAt', 'ASC']],
  });
  if (!ticket) return;
  res.render('tickets/show', { title: ticket.protocolo, ticket });
};

// GET /tickets/:id/edit (admin)
exports.edit = async (req, res) => {
  const ticket = await findOr404(req, res);
  if (!ticket) return;
  res.render('tickets/form', {
    title: `Editar ${ticket.protocolo}`,
    ticket,
    errors: [],
    isEdit: true,
    categorias: await categorias(),
  });
};

// PUT /tickets/:id (admin)
exports.update = async (req, res) => {
  const ticket = await findOr404(req, res);
  if (!ticket) return;
  const b = req.body;
  const data = {
    titulo: (b.titulo || '').trim(),
    descricao: (b.descricao || '').trim(),
    setor: b.setor || null,
    prioridade: PRIORIDADES[b.prioridade] ? b.prioridade : ticket.prioridade,
    status: STATUS[b.status] ? b.status : ticket.status,
    categoryId: b.categoryId || null,
  };
  try {
    await ticket.update(data);
    res.redirect(`/tickets/${ticket.id}?msg=${encodeURIComponent('Chamado atualizado.')}`);
  } catch (err) {
    const errors = validationMessages(err);
    if (!errors) throw err;
    res.status(422).render('tickets/form', {
      title: `Editar ${ticket.protocolo}`,
      ticket: { ...data, id: ticket.id, protocolo: ticket.protocolo, solicitante: ticket.solicitante, emailSolicitante: ticket.emailSolicitante },
      errors,
      isEdit: true,
      categorias: await categorias(),
    });
  }
};

// PATCH /tickets/:id/quick (tecnico/admin) — assumir, liberar e alterar status/prioridade
exports.quickUpdate = async (req, res) => {
  const ticket = await findOr404(req, res);
  if (!ticket) return;

  const user = req.user;
  const ehAdmin = user.perfil === 'admin';
  const msgs = [];
  const voltar = (chave, texto) => res.redirect(`/tickets/${ticket.id}?${chave}=${encodeURIComponent(texto)}`);
  const { acao, status, prioridade } = req.body;

  if (acao === 'assumir') {
    if (ticket.tecnicoUid === user.uid) return voltar('erro', 'Este chamado já está com você.');
    if (ticket.tecnicoResponsavel && !ehAdmin) {
      return voltar('erro', `Este chamado já foi assumido por ${ticket.tecnicoResponsavel}.`);
    }
    ticket.tecnicoUid = user.uid;
    ticket.tecnicoResponsavel = user.nome;
    msgs.push(`Chamado assumido por ${user.nome}.`);
    if (ticket.status === 'aberto') {
      ticket.status = 'em_andamento';
      msgs.push(`Status alterado de "${STATUS.aberto.label}" para "${STATUS.em_andamento.label}".`);
    }
  } else if (acao === 'liberar') {
    if (ticket.tecnicoUid !== user.uid && !ehAdmin) return voltar('erro', 'Só quem assumiu o chamado (ou um admin) pode liberá-lo.');
    if (!ticket.tecnicoResponsavel) return voltar('erro', 'O chamado já está sem responsável.');
    msgs.push(`Chamado liberado por ${user.nome} (antes com ${ticket.tecnicoResponsavel}).`);
    ticket.tecnicoUid = null;
    ticket.tecnicoResponsavel = null;
  } else {
    if (status && STATUS[status] && status !== ticket.status) {
      msgs.push(`Status alterado de "${STATUS[ticket.status].label}" para "${STATUS[status].label}" por ${user.nome}.`);
      ticket.status = status;
    }
    // Prioridade: somente admin.
    if (ehAdmin && prioridade && PRIORIDADES[prioridade] && prioridade !== ticket.prioridade) {
      msgs.push(`Prioridade alterada de "${PRIORIDADES[ticket.prioridade].label}" para "${PRIORIDADES[prioridade].label}".`);
      ticket.prioridade = prioridade;
    }
  }

  if (!msgs.length) return voltar('erro', 'Nenhuma alteração realizada.');

  await ticket.save();
  await historico(ticket, msgs);
  return voltar('msg', 'Chamado atualizado.');
};

// DELETE /tickets/:id (admin)
exports.destroy = async (req, res) => {
  const ticket = await findOr404(req, res);
  if (!ticket) return;
  const protocolo = ticket.protocolo;
  await ticket.destroy();
  res.redirect(`/tickets?msg=${encodeURIComponent(`Chamado ${protocolo} excluído.`)}`);
};
