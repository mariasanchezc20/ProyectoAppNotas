const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const {
  handleValidation,
  registerRules,
  loginRules,
} = require('../middleware/validate');

const router = express.Router();

// S-05: limita intentos de login/registro para mitigar fuerza bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intenta más tarde.' },
});

router.post('/register', authLimiter, registerRules, handleValidation, ctrl.register);
router.get('/verify', ctrl.verifyEmail);
router.post('/login', authLimiter, loginRules, handleValidation, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);
router.post('/public-key', requireAuth, ctrl.setPublicKey);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
