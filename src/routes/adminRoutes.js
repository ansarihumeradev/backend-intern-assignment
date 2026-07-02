const express = require('express');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/role');
const User = require('../models/userModel');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: { users: users.map(u => u.toSafeObject()) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
