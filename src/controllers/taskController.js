const mongoose = require('mongoose');
const Task = require('../models/taskModel');
const ApiError = require('../utils/ApiError');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function create(req, res, next) {
  try {
    const { title, description, status } = req.body;
    const task = await Task.create({ userId: req.user.id, title, description, status });
    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.id };
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, data: { tasks } });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    if (!isValidId(req.params.id)) return next(new ApiError(400, 'Invalid task id'));
    const task = await Task.findById(req.params.id);
    if (!task) return next(new ApiError(404, 'Task not found'));

    if (req.user.role !== 'admin' && String(task.userId) !== req.user.id) {
      return next(new ApiError(403, 'You do not have access to this task'));
    }

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (!isValidId(req.params.id)) return next(new ApiError(400, 'Invalid task id'));
    const task = await Task.findById(req.params.id);
    if (!task) return next(new ApiError(404, 'Task not found'));

    if (req.user.role !== 'admin' && String(task.userId) !== req.user.id) {
      return next(new ApiError(403, 'You do not have access to this task'));
    }

    const { title, description, status } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    await task.save();

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (!isValidId(req.params.id)) return next(new ApiError(400, 'Invalid task id'));
    const task = await Task.findById(req.params.id);
    if (!task) return next(new ApiError(404, 'Task not found'));

    if (req.user.role !== 'admin' && String(task.userId) !== req.user.id) {
      return next(new ApiError(403, 'You do not have access to this task'));
    }

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, remove };
