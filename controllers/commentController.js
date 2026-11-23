const { Ticket, Comment } = require('../models');
const { validationMessages } = require('../utils/helpers');

// POST /tickets/:id/comments
// "user" só comenta nos próprios chamados; técnico/admin comentam em qualquer um
// (e o comentário deles é registrado como "parecer técnico").
exports.create = async (req, res) => {
  const staff = req.user.perfil === 'tecnico' || req.user.perfil === 'admin';
  const where = staff ? { id: req.params.id } : { id: req.params.id, autorUid: req.user.uid };
  const ticket = await Ticket.findOne({ where });
  if (!ticket) return res.status(404).render('404', { title: 'Chamado não encontrado' });

  try {
    await Comment.create({
      ticketId: ticket.id,
      autor: req.user.nome,
      mensagem: (req.body.mensagem || '').trim(),
      tipo: staff ? 'parecer' : 'comentario',
    });
    res.redirect(`/tickets/${ticket.id}?msg=${encodeURIComponent(staff ? 'Parecer técnico registrado.' : 'Comentário adicionado.')}#comentarios`);
  } catch (err) {
    const errors = validationMessages(err);
    if (!errors) throw err;
    res.redirect(`/tickets/${ticket.id}?erro=${encodeURIComponent(errors.join(' '))}#comentarios`);
  }
};
