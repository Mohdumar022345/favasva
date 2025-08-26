import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/messages', authenticateToken, ChatController.sendMessage);
router.get('/conversations', authenticateToken, ChatController.getConversations);
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getConversationMessages);

export default router;