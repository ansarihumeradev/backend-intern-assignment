const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(new ApiError(409, 'Email is already registered'));

    // Public signup always creates a 'user' role — admin must be granted directly in the DB.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: 'user' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: user.toSafeObject(), accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(new ApiError(401, 'Invalid email or password'));

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return next(new ApiError(401, 'Invalid email or password'));

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: user.toSafeObject(), accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new ApiError(400, 'refreshToken is required'));

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return next(new ApiError(401, 'Invalid or expired refresh token'));
    }

    const user = await User.findById(decoded.id);
    if (!user) return next(new ApiError(401, 'User no longer exists'));

    const accessToken = signAccessToken(user);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new ApiError(404, 'User not found'));
    res.json({ success: true, data: { user: user.toSafeObject() } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, me };
