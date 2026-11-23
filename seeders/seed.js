/**
 * Popula o banco com dados de exemplo.
 *  - Executado automaticamente na primeira inicialização (banco vazio).
 *  - `npm run seed` recria o banco do zero com os dados de exemplo.
 */
const { sequelize, Category, Ticket, Comment } = require('../models');

const horasAtras = (h) => new Date(Date.now() - h * 36e5);

async function seed({ onlyIfEmpty = false } = {}) {
  if (onlyIfEmpty && (await Category.count()) > 0) return;

  const categorias = await Category.bulkCreate([
    { nome: 'Hardware', descricao: 'Computadores, notebooks, periféricos e impressoras.', cor: '#f59e0b' },
    { nome: 'Software', descricao: 'Instalação, licenças e erros em aplicativos.', cor: '#6366f1' },
    { nome: 'Rede & Internet', descricao: 'Conectividade, Wi-Fi, VPN e cabeamento.', cor: '#06b6d4' },
    { nome: 'Acessos & Contas', descricao: 'Criação de usuários, senhas e permissões.', cor: '#ec4899' },
    { nome: 'E-mail', descricao: 'Caixa de correio, listas e configurações de e-mail.', cor: '#10b981' },
  ]);
  const [hardware, software, rede, acessos, email] = categorias;

  // Nomes usados só nos dados de exemplo (técnicos reais são usuários com perfil "tecnico").
  const ana = 'Ana Souza';
  const bruno = 'Bruno Lima';
  const carla = 'Carla Mendes';

  const dados = [
    {
      titulo: 'Servidor de arquivos inacessível',
      descricao: 'Ninguém do financeiro consegue acessar a unidade de rede F:. Aparece "caminho de rede não encontrado".',
      solicitante: 'Marcos Pereira', emailSolicitante: 'marcos@empresa.local', setor: 'Financeiro',
      prioridade: 'critica', status: 'em_andamento', categoryId: rede.id, tecnicoResponsavel: ana, createdAt: horasAtras(3),
    },
    {
      titulo: 'Notebook não liga após atualização',
      descricao: 'Após a atualização do Windows ontem à noite o notebook não passa da tela do fabricante.',
      solicitante: 'Juliana Alves', emailSolicitante: 'juliana@empresa.local', setor: 'Comercial',
      prioridade: 'alta', status: 'aberto', categoryId: hardware.id, tecnicoResponsavel: null, createdAt: horasAtras(5),
    },
    {
      titulo: 'Criar acesso para novo colaborador',
      descricao: 'O colaborador Rafael Torres inicia segunda-feira. Precisa de usuário de rede, e-mail e acesso ao ERP.',
      solicitante: 'Patrícia Gomes', emailSolicitante: 'patricia@empresa.local', setor: 'Recursos Humanos',
      prioridade: 'media', status: 'aberto', categoryId: acessos.id, tecnicoResponsavel: carla, createdAt: horasAtras(26),
    },
    {
      titulo: 'Impressora do 2º andar atolando papel',
      descricao: 'A impressora HP do corredor atola papel a cada 3 ou 4 folhas.',
      solicitante: 'Fernanda Costa', setor: 'Administrativo',
      prioridade: 'baixa', status: 'aberto', categoryId: hardware.id, tecnicoResponsavel: bruno, createdAt: horasAtras(30),
    },
    {
      titulo: 'Excel travando ao abrir planilhas grandes',
      descricao: 'Planilhas acima de 20 MB fazem o Excel parar de responder.',
      solicitante: 'Ricardo Nunes', emailSolicitante: 'ricardo@empresa.local', setor: 'Financeiro',
      prioridade: 'media', status: 'resolvido', categoryId: software.id, tecnicoResponsavel: carla,
      createdAt: horasAtras(72), resolvidoEm: horasAtras(66),
    },
    {
      titulo: 'Wi-Fi instável na sala de reuniões',
      descricao: 'A conexão cai constantemente durante videoconferências na sala Atlântico.',
      solicitante: 'Luciana Prado', setor: 'Diretoria',
      prioridade: 'alta', status: 'em_andamento', categoryId: rede.id, tecnicoResponsavel: ana, createdAt: horasAtras(20),
    },
    {
      titulo: 'Caixa de e-mail cheia',
      descricao: 'Recebendo aviso de que a caixa de correio atingiu o limite de armazenamento.',
      solicitante: 'Eduardo Martins', emailSolicitante: 'eduardo@empresa.local', setor: 'Marketing',
      prioridade: 'baixa', status: 'resolvido', categoryId: email.id, tecnicoResponsavel: bruno,
      createdAt: horasAtras(120), resolvidoEm: horasAtras(118),
    },
    {
      titulo: 'Senha do ERP bloqueada',
      descricao: 'Errei a senha algumas vezes e o usuário foi bloqueado.',
      solicitante: 'Sônia Ribeiro', setor: 'Operações',
      prioridade: 'alta', status: 'resolvido', categoryId: acessos.id, tecnicoResponsavel: carla,
      createdAt: horasAtras(48), resolvidoEm: horasAtras(47.5),
    },
    {
      titulo: 'Instalar Adobe Acrobat',
      descricao: 'Preciso do Acrobat Pro para editar contratos em PDF.',
      solicitante: 'Gustavo Teixeira', setor: 'Comercial',
      prioridade: 'media', status: 'aberto', categoryId: software.id, tecnicoResponsavel: null, createdAt: horasAtras(1.5),
    },
    {
      titulo: 'VPN não conecta em home office',
      descricao: 'O cliente VPN retorna erro 809 ao tentar conectar de casa.',
      solicitante: 'Aline Ferreira', emailSolicitante: 'aline@empresa.local', setor: 'Marketing',
      prioridade: 'critica', status: 'aberto', categoryId: rede.id, tecnicoResponsavel: null, createdAt: horasAtras(0.6),
    },
  ];

  for (const d of dados) {
    // Dados de exemplo não pertencem a nenhuma conta do Firebase (autorUid nulo):
    // só técnicos/admins os enxergam.
    const t = await Ticket.create({ ...d, autorNome: d.solicitante, autorEmail: d.emailSolicitante || null });
    await Comment.create({
      ticketId: t.id, autor: 'Sistema', tipo: 'sistema',
      mensagem: `Chamado aberto por ${t.autorNome}.`, createdAt: d.createdAt,
    });
  }

  // Alguns comentários de exemplo
  const servidor = await Ticket.findOne({ where: { titulo: 'Servidor de arquivos inacessível' } });
  await Comment.bulkCreate([
    { ticketId: servidor.id, autor: 'Sistema', tipo: 'sistema', mensagem: 'Chamado atribuído a Ana Souza.', createdAt: horasAtras(2.8) },
    { ticketId: servidor.id, autor: 'Ana Souza', tipo: 'parecer', mensagem: 'Identificado problema no serviço SMB do servidor FS01. Reiniciando serviço e verificando logs.', createdAt: horasAtras(2.5) },
    { ticketId: servidor.id, autor: 'Marcos Pereira', mensagem: 'Obrigado! Temos fechamento de mês hoje, é bem urgente.', createdAt: horasAtras(2) },
  ]);

  console.log('  ✔ Dados de exemplo inseridos.');
}

module.exports = seed;

// Execução direta: `npm run seed` (recria o banco)
if (require.main === module) {
  (async () => {
    await sequelize.sync({ force: true });
    await seed();
    await sequelize.close();
    console.log('  ✔ Banco recriado com sucesso.');
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
