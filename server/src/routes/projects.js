import express from 'express';
import { body } from 'express-validator';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  generateCode,
  updateCode,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [body('prompt').notEmpty().withMessage('Prompt is required')],
  createProject
);

router.get('/', getProjects);

router.get('/:id', getProject);

router.put('/:id', updateProject);

router.delete('/:id', deleteProject);

router.post('/:id/generate-code', generateCode);

router.put('/:id/code', [body('manimCode').notEmpty()], updateCode);

export default router;
