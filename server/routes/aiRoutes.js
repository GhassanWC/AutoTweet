const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

// Status check (no auth needed)
router.get('/status', aiController.getStatus);

// All generation routes require auth
router.use(requireAuth);

router.post('/generate', aiController.generatePost);
router.post('/variations', aiController.generateVariations);
router.post('/thread', aiController.generateThread);
router.post('/ideas', aiController.generateIdeas);
router.post('/generate-prompt', aiController.generatePrompt);
router.post('/generate-image', aiController.generateImage);

module.exports = router;
