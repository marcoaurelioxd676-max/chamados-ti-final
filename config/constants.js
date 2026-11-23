// Valores de domínio utilizados por models, controllers e views.

// Status do chamado (atividade: Aberto, Em Atendimento, Resolvido).
const STATUS = {
  aberto: { label: 'Aberto', cor: 'blue' },
  em_andamento: { label: 'Em Atendimento', cor: 'amber' },
  resolvido: { label: 'Resolvido', cor: 'green' },
};

// Status considerados "em aberto" (ainda exigem ação da equipe).
const STATUS_ATIVOS = ['aberto', 'em_andamento'];

const PRIORIDADES = {
  baixa: { label: 'Baixa', cor: 'gray', peso: 1 },
  media: { label: 'Média', cor: 'blue', peso: 2 },
  alta: { label: 'Alta', cor: 'amber', peso: 3 },
  critica: { label: 'Crítica', cor: 'red', peso: 4 },
};

// Perfis de acesso (RBAC). O valor gravado no Firestore é a chave (user | tecnico | admin).
const PERFIS = {
  user: { label: 'Usuário', cor: 'gray' },
  tecnico: { label: 'Técnico', cor: 'blue' },
  admin: { label: 'Admin', cor: 'purple' },
};
const PERFIL_PADRAO = 'user';

const SETORES = [
  'Administrativo',
  'Comercial',
  'Diretoria',
  'Financeiro',
  'Marketing',
  'Operações',
  'Recursos Humanos',
  'TI',
];

module.exports = { STATUS, STATUS_ATIVOS, PRIORIDADES, PERFIS, PERFIL_PADRAO, SETORES };
