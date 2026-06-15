const { body, query, validationResult } = require('express-validator');

/**
 * S-05: Recoge los errores de validación y responde de forma uniforme.
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Datos inválidos',
      errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
}

// --- Reglas reutilizables ---

const registerRules = [
  body('email').isEmail().withMessage('Correo inválido').normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Za-z]/)
    .withMessage('La contraseña debe contener letras')
    .matches(/\d/)
    .withMessage('La contraseña debe contener números'),
  // Clave pública RSA opcional en el registro (puede enviarse luego).
  body('rsaPublicKey').optional().isString().isLength({ max: 4096 }),
];

const loginRules = [
  body('email').isEmail().withMessage('Correo inválido').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Contraseña requerida'),
];

const encryptedContentRules = [
  body('content').isObject().withMessage('Contenido cifrado requerido'),
  body('content.encryptedKey').isString().notEmpty(),
  body('content.iv').isString().notEmpty(),
  body('content.cipherText').isString().notEmpty(),
  body('content.authTag').isString().notEmpty(),
];

const noteCreateRules = [
  body('title').isString().trim().isLength({ min: 1, max: 200 }).escape(),
  body('category').optional().isString().trim().isLength({ max: 60 }).escape(),
  body('clientId').optional().isString().isLength({ max: 100 }),
  ...encryptedContentRules,
];

const noteUpdateRules = [
  body('title').optional().isString().trim().isLength({ min: 1, max: 200 }).escape(),
  body('category').optional().isString().trim().isLength({ max: 60 }).escape(),
  body('content').optional().isObject(),
  body('content.encryptedKey').optional().isString().notEmpty(),
  body('content.iv').optional().isString().notEmpty(),
  body('content.cipherText').optional().isString().notEmpty(),
  body('content.authTag').optional().isString().notEmpty(),
];

const searchRules = [
  query('q').optional().isString().trim().isLength({ max: 200 }).escape(),
  query('category').optional().isString().trim().isLength({ max: 60 }).escape(),
];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  noteCreateRules,
  noteUpdateRules,
  searchRules,
};
