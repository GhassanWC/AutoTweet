const express = require('express');
const router = express.Router();
const pillarController = require('../controllers/contentPillarController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', pillarController.getAll);
router.post('/', pillarController.create);
router.put('/:id', pillarController.update);
router.delete('/:id', pillarController.remove);

module.exports = router;
