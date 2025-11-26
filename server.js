const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const aiRoutes = require('./src/routes/aiRoutes');
const analysisRoutes = require('./src/routes/analysisRoutes');
const personaRoutes = require('./src/routes/personaRoutes');
const docsRoutes = require('./src/routes/docsRoutes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the server is running and get system information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: K-Psyche Backend
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 port:
 *                   type: string
 *                   example: "3000"
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'K-Psyche Backend',
    version: '1.0.0',
    port: config.port,
    environment: config.nodeEnv
  });
});

// API Documentation
app.use('/api-docs', docsRoutes);

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/personas', personaRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 K-Psyche Backend running on port ${config.port}`);
  console.log(`📚 API Documentation: http://localhost:${config.port}/api-docs`);
  console.log(`� Hnealth check: GET http://localhost:${config.port}/api/health`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
});

module.exports = app;
