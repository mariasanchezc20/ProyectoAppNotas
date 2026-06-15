const express = require('express');
const ctrl = require('../controllers/noteController');
const { requireAuth } = require('../middleware/auth');
const {
  handleValidation,
  noteCreateRules,
  noteUpdateRules,
  searchRules,
} = require('../middleware/validate');

const router = express.Router();

// Todas las rutas de notas requieren autenticación (S-04).
router.use(requireAuth);

router.get('/search', searchRules, handleValidation, ctrl.searchNotes); // F-06
router.post('/sync', ctrl.syncNotes); // F-07

router.get('/', ctrl.listNotes);
router.post('/', noteCreateRules, handleValidation, ctrl.createNote); // F-03
router.get('/:id', ctrl.getNote);
router.put('/:id', noteUpdateRules, handleValidation, ctrl.updateNote); // F-04
router.delete('/:id', ctrl.deleteNote); // F-05

module.exports = router;
