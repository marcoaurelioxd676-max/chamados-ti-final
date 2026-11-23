const { Op } = require('sequelize');
const { Ticket, Category } = require('../models');
const { STATUS, PRIORIDADES, STATUS_ATIVOS } = require('../config/constants');

exports.index = async (req, res) => {
  const staff = req.user.perfil === 'tecnico' || req.user.perfil === 'admin';
  // "user" vê o painel apenas com os próprios chamados.
  const escopo = staff ? {} : { autorUid: req.user.uid };
  const comEscopo = (extra = {}) => ({ ...escopo, ...extra });

  const porStatus = {};
  for (const s of Object.keys(STATUS)) {
    porStatus[s] = await Ticket.count({ where: comEscopo({ status: s }) });
  }
  const total = Object.values(porStatus).reduce((a, b) => a + b, 0);
  const ativos = STATUS_ATIVOS.reduce((acc, s) => acc + porStatus[s], 0);

  const porPrioridade = {};
  for (const p of Object.keys(PRIORIDADES)) {
    porPrioridade[p] = await Ticket.count({ where: comEscopo({ prioridade: p, status: { [Op.in]: STATUS_ATIVOS } }) });
  }

  const include = [{ model: Category, as: 'categoria' }];

  const prioritarios = await Ticket.findAll({
    where: comEscopo({ prioridade: { [Op.in]: ['critica', 'alta'] }, status: { [Op.in]: STATUS_ATIVOS } }),
    include,
    order: [['createdAt', 'ASC']],
    limit: 5,
  });

  const recentes = await Ticket.findAll({ where: escopo, include, order: [['createdAt', 'DESC']], limit: 6 });

  const semTecnico = await Ticket.count({
    where: comEscopo({ tecnicoResponsavel: null, status: { [Op.in]: STATUS_ATIVOS } }),
  });

  // Carga de trabalho por técnico (quem assumiu chamados) — só para técnico/admin
  let equipe = [];
  if (staff) {
    const atribuidos = await Ticket.findAll({
      where: { tecnicoResponsavel: { [Op.ne]: null } },
      attributes: ['tecnicoResponsavel', 'status'],
    });
    const mapa = new Map();
    atribuidos.forEach((t) => {
      const e = mapa.get(t.tecnicoResponsavel) || { nome: t.tecnicoResponsavel, ativos: 0, resolvidos: 0 };
      if (STATUS_ATIVOS.includes(t.status)) e.ativos += 1;
      else e.resolvidos += 1;
      mapa.set(t.tecnicoResponsavel, e);
    });
    equipe = [...mapa.values()].sort((a, b) => b.ativos - a.ativos);
  }

  const categoriasRaw = await Category.findAll({
    include: [{
      model: Ticket, as: 'tickets', attributes: ['id'], required: false,
      ...(staff ? {} : { where: escopo }),
    }],
  });
  const categorias = categoriasRaw
    .map((c) => ({ nome: c.nome, cor: c.cor, total: c.tickets.length }))
    .sort((a, b) => b.total - a.total);

  const resolvidos = await Ticket.findAll({
    where: comEscopo({ resolvidoEm: { [Op.ne]: null } }),
    attributes: ['createdAt', 'resolvidoEm'],
  });
  const tempoMedio = resolvidos.length
    ? resolvidos.reduce((acc, t) => acc + (t.resolvidoEm - t.createdAt), 0) / resolvidos.length / 36e5
    : null;

  res.render('dashboard', {
    title: 'Dashboard',
    total, ativos, porStatus, porPrioridade, prioritarios, recentes, semTecnico, equipe, categorias, tempoMedio,
  });
};
