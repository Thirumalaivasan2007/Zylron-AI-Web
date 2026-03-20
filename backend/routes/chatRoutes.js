const express = require('express');
const router = express.Router();
const { chatWithAI, getHistory, getSessionHistory, deleteSession } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, chatWithAI);
router.get('/history', protect, getHistory);
router.get('/session/:sessionId', protect, getSessionHistory);
router.delete('/session/:sessionId', protect, deleteSession);

module.exports = router;
