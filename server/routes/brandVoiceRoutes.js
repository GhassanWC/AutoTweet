const express = require('express');
const router = express.Router();
const brandVoiceController = require('../controllers/brandVoiceController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', brandVoiceController.get);
router.post('/', brandVoiceController.save);

module.exports = router;
