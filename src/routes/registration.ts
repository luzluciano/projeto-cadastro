import { Router } from 'express';
import { body } from 'express-validator';
import {
  createRegistration,
  getRegistrations,
  getRegistration,
  updateRegistration,
  deleteRegistration,
  updateRegistrationStatus
} from '../controllers/registrationController';

const router = Router();

// Validation rules for registration
const registrationValidation = [
  body('nomeCompleto')
    .notEmpty()
    .withMessage('Nome completo é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Nome não pode exceder 100 caracteres'),
    
  body('dataNascimento')
    .isISO8601()
    .withMessage('Data de nascimento deve ser uma data válida'),
    
  body('endereco.rua')
    .notEmpty()
    .withMessage('Rua é obrigatória'),
    
  body('endereco.numero')
    .notEmpty()
    .withMessage('Número é obrigatório'),
    
  body('endereco.bairro')
    .notEmpty()
    .withMessage('Bairro é obrigatório'),
    
  body('endereco.cidade')
    .notEmpty()
    .withMessage('Cidade é obrigatória'),
    
  body('endereco.cep')
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido'),
    
  body('telefone')
    .notEmpty()
    .withMessage('Telefone é obrigatório'),
    
  body('email')
    .isEmail()
    .withMessage('Email deve ter formato válido'),
    
  body('nomeResponsavel')
    .notEmpty()
    .withMessage('Nome do responsável é obrigatório')
    .isLength({ max: 100 })
    .withMessage('Nome do responsável não pode exceder 100 caracteres'),
    
  body('telefoneResponsavel')
    .notEmpty()
    .withMessage('Telefone do responsável é obrigatório'),
    
  body('serie')
    .notEmpty()
    .withMessage('Série é obrigatória'),
    
  body('turma')
    .notEmpty()
    .withMessage('Turma é obrigatória'),
    
  body('anoLetivo')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Ano letivo deve estar entre 2020 e 2030'),
    
  body('observacoes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observações não podem exceder 500 caracteres')
];

// Routes
router.post('/', registrationValidation, createRegistration);
router.get('/', getRegistrations);
router.get('/:id', getRegistration);
router.put('/:id', registrationValidation, updateRegistration);
router.delete('/:id', deleteRegistration);
router.patch('/:id/status', updateRegistrationStatus);

export default router;