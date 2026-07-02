const express = require('express');
const { body } = require('express-validator');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const taskController = require('../controllers/taskController');

const router = express.Router();

// All task routes require a valid JWT.
router.use(authenticate);

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 */
router.post(
  '/',
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  ],
  validate,
  taskController.create
);

router.get('/', taskController.list);

router.get('/:id', taskController.getOne);

router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  ],
  validate,
  taskController.update
);

router.delete('/:id', taskController.remove);

module.exports = router;
