const express = require('express');
const dashboard = require('../controllers/dashboardController');
const tickets = require('../controllers/ticketController');
const comments = require('../controllers/commentController');
const categories = require('../controllers/categoryController');
const authCtrl = require('../controllers/authController');
const admin = require('../controllers/adminController');
const { exigirLogin, exigirPerfil } = require('../middlewares/auth');

const router = express.Router();

// ---------- Rotas públicas (login) ----------
router.get('/login', authCtrl.paginaLogin);
router.post('/auth/session', authCtrl.criarSessao);
router.post('/logout', authCtrl.logout);

// ---------- A partir daqui é preciso estar logado ----------
router.use(exigirLogin);

// Dashboard
router.get('/', dashboard.index);

// Chamados (user: só os próprios; tecnico/admin: todos — filtro feito nos controllers)
router.get('/tickets', tickets.index);
router.get('/tickets/new', tickets.new);
router.post('/tickets', tickets.create);
router.get('/tickets/:id', tickets.show);
router.get('/tickets/:id/edit', exigirPerfil('admin'), tickets.edit);
router.put('/tickets/:id', exigirPerfil('admin'), tickets.update);
router.patch('/tickets/:id/quick', exigirPerfil('tecnico', 'admin'), tickets.quickUpdate); // atendimento
router.delete('/tickets/:id', exigirPerfil('admin'), tickets.destroy);
router.post('/tickets/:id/comments', comments.create);

// Gestão de usuários (admin)
router.get('/admin/usuarios', exigirPerfil('admin'), admin.usuarios);
router.post('/admin/usuarios/:uid/perfil', exigirPerfil('admin'), admin.alterarPerfil);

// Categorias (admin)
router.get('/categories', exigirPerfil('admin'), categories.index);
router.get('/categories/new', exigirPerfil('admin'), categories.new);
router.post('/categories', exigirPerfil('admin'), categories.create);
router.get('/categories/:id/edit', exigirPerfil('admin'), categories.edit);
router.put('/categories/:id', exigirPerfil('admin'), categories.update);
router.delete('/categories/:id', exigirPerfil('admin'), categories.destroy);

module.exports = router;
