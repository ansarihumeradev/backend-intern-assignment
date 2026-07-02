const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../src/config/swagger');

const authRoutes = require('../src/routes/authRoutes');
const taskRoutes = require('../src/routes/taskRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const { notFound, errorHandler } = require('../src/middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // small limit mitigates payload-based DoS

// Serve the demo frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Versioned API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/api/v1/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
