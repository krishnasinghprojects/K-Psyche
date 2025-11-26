const express = require('express');
const personaController = require('../controllers/personaController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/personas/create:
 *   post:
 *     summary: Create a new persona
 *     description: Create a new persona profile for tracking analyses
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Persona name
 *                 example: John Doe
 *               relationship:
 *                 type: string
 *                 description: Relationship to user
 *                 example: Client
 *               summary:
 *                 type: string
 *                 description: Brief summary
 *                 example: Tech startup founder, analytical personality
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *                 example: Met at conference 2024
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags for categorization
 *                 example: ["client", "tech"]
 *     responses:
 *       201:
 *         description: Persona created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 persona:
 *                   $ref: '#/components/schemas/Persona'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/create',
  verifyToken,
  (req, res) => personaController.createPersona(req, res)
);

/**
 * @swagger
 * /api/personas/list:
 *   get:
 *     summary: Get all personas
 *     description: Retrieve list of all personas for the authenticated user
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of personas to return
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to order by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of personas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 3
 *                 personas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Persona'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/list',
  verifyToken,
  (req, res) => personaController.getPersonas(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}:
 *   get:
 *     summary: Get persona details
 *     description: Retrieve detailed information about a specific persona
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     responses:
 *       200:
 *         description: Persona details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 persona:
 *                   $ref: '#/components/schemas/Persona'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:personaId',
  verifyToken,
  (req, res) => personaController.getPersonaDetails(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}:
 *   put:
 *     summary: Update persona
 *     description: Update persona information
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               relationship:
 *                 type: string
 *               summary:
 *                 type: string
 *               notes:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Persona updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 persona:
 *                   $ref: '#/components/schemas/Persona'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put(
  '/:personaId',
  verifyToken,
  (req, res) => personaController.updatePersona(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}:
 *   delete:
 *     summary: Delete persona
 *     description: Delete a persona and all associated data
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     responses:
 *       200:
 *         description: Persona deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Persona deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:personaId',
  verifyToken,
  (req, res) => personaController.deletePersona(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}/analyses:
 *   get:
 *     summary: Get persona's analyses
 *     description: Retrieve analysis history for a specific persona
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of analyses to return
 *     responses:
 *       200:
 *         description: List of analyses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 5
 *                 analyses:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:personaId/analyses',
  verifyToken,
  (req, res) => personaController.getPersonaAnalyses(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}/stats:
 *   get:
 *     summary: Get persona statistics
 *     description: Get statistical analysis of persona's behavioral data
 *     tags: [Personas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     responses:
 *       200:
 *         description: Persona statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalAnalyses:
 *                       type: number
 *                       example: 15
 *                     sentimentDistribution:
 *                       type: object
 *                       example: { "Positive": 8, "Neutral": 4, "Anxious": 3 }
 *                     topTraits:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           trait:
 *                             type: string
 *                           count:
 *                             type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:personaId/stats',
  verifyToken,
  (req, res) => personaController.getPersonaStats(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}/ask:
 *   post:
 *     summary: Ask a question about a persona
 *     description: Use RAG to answer questions about a persona based on their analysis history
 *     tags: [Query]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 description: Question to ask about the persona
 *                 example: What are the dominant personality traits?
 *     responses:
 *       200:
 *         description: Answer with context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 question:
 *                   type: string
 *                 answer:
 *                   type: string
 *                   example: Based on the behavioral context, the dominant traits are Analytical and Confident...
 *                 context_used:
 *                   type: array
 *                   items:
 *                     type: object
 *                 persona:
 *                   type: object
 *                 metadata:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:personaId/ask',
  verifyToken,
  (req, res) => personaController.askQuestion(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}/batch-ask:
 *   post:
 *     summary: Ask multiple questions about a persona
 *     description: Batch query multiple questions at once (max 5)
 *     tags: [Query]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questions
 *             properties:
 *               questions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 5
 *                 example: ["What are the dominant traits?", "How has sentiment changed?"]
 *     responses:
 *       200:
 *         description: Batch answers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:personaId/batch-ask',
  verifyToken,
  (req, res) => personaController.batchAskQuestions(req, res)
);

/**
 * @swagger
 * /api/personas/{personaId}/suggested-questions:
 *   get:
 *     summary: Get suggested questions
 *     description: Get AI-generated suggested questions based on persona's data
 *     tags: [Query]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Persona ID
 *     responses:
 *       200:
 *         description: List of suggested questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["What are John Doe's dominant personality traits?", "How has sentiment changed over time?"]
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:personaId/suggested-questions',
  verifyToken,
  (req, res) => personaController.getSuggestedQuestions(req, res)
);

module.exports = router;
