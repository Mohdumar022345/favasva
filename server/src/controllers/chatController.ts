import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, StreamEventData, StreamEventType } from '../types';
import { ConversationService } from '../services/conversationService';
import { MessageService } from '../services/messageService';
import { AIService } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  conversationId: z.string().optional()
});

export class ChatController {
  static async sendMessage(req: AuthRequest, res: Response) {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush headers to the client immediately

    const sendEvent = (event: StreamEventType, data: StreamEventData) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let isNewConversation = false; // Flag to track if it's a new conversation
    let conversationCreatedSuccessfully = false; // Track if conversation was created

    try {
      const { content, conversationId } = sendMessageSchema.parse(req.body);
      const userId = req.user!.id;

      let conversation;
      let conversationHistory: Array<{role: string, content: string}> = [];

      // Handle existing or new conversation
      if (conversationId) {
        conversation = await ConversationService.getConversation(conversationId, userId);
        if (!conversation) {
          res.status(404); // Set status before sending error event
          sendEvent('error', { content: 'Conversation not found' });
          return res.end();
        }
        
        // Get conversation history for AI context
        const messages = await MessageService.getConversationMessages(conversationId);
        conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      } else {
        isNewConversation = true; // Mark as new conversation
        conversation = await ConversationService.createConversation(userId, "New Chat"); // Temporary title
        conversationCreatedSuccessfully = true; // Mark as created
      }

      // Save user message
      const userMessage = await MessageService.createMessage(
        conversation.id,
        content,
        'user'
      );

      // Send initial event with user message and conversation ID
      sendEvent('initial', {
        conversationId: conversation.id,
        userMessage: userMessage
      });

      let fullAssistantResponseContent = '';
      const assistantMessageId = uuidv4(); // Generate ID for assistant message once

      try {
        // Generate AI response as a stream
        const aiStream = AIService.generateResponse(content, conversationHistory);

        for await (const chunk of aiStream) {
          fullAssistantResponseContent += chunk;
          // Send each chunk as a 'message' event
          sendEvent('message', {
            id: assistantMessageId, // Use the consistent ID for the assistant message
            chunk: chunk,
            conversationId: conversation.id // Include conversationId for context
          });
        }

        // Save the complete AI message after the stream finishes
        const assistantMessage = await MessageService.createMessage(
          conversation.id,
          fullAssistantResponseContent,
          'assistant'
        );

        // Send a 'done' event
        sendEvent('done', {
          conversationId: conversation.id,
          assistantMessage: assistantMessage // Optionally send the full message here
        });

        // --- Relocated and refined logic for AI title generation ---
        // Only generate/update title if the conversation still has the temporary "New Chat" title
        if (conversation.title === "New Chat") {
          // Generate title and await its completion before closing the stream
          try {
            const aiGeneratedTitle = await AIService.generateChatTitle(content); // Use current message content
            await ConversationService.updateConversationTitle(conversation.id, aiGeneratedTitle);
            console.log(`Conversation ${conversation.id} title updated to: "${aiGeneratedTitle}"`);
            // Send titleUpdate event to frontend
            sendEvent('titleUpdate', {
              conversationId: conversation.id,
              newTitle: aiGeneratedTitle
            });
          } catch (titleError) {
            console.error(`Failed to generate or update title for conversation ${conversation.id}:`, titleError);
            // Fallback to a default title if AI generation fails
            const defaultTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
            await ConversationService.updateConversationTitle(conversation.id, defaultTitle);
            sendEvent('titleUpdate', {
              conversationId: conversation.id,
              newTitle: defaultTitle
            });
          }
        }
        // --- End relocated and refined logic ---

      } catch (aiError) {
        console.error('AI Service Error during streaming:', aiError);
        const errorMessage = "I'm sorry, I couldn't generate a response at this time. Please try again.";
        sendEvent('error', { content: errorMessage });
        // Optionally save an error message to the database
        await MessageService.createMessage(
          conversation.id,
          errorMessage,
          'assistant'
        );

        // Removed the immediate deletion of new conversations on AI error.
        // The conversation will now persist, allowing the user to retry.
        // Cleanup of unconfirmed/failed conversations would require a separate
        // background process or explicit client-side abandonment.
      }
    } catch (error) {
      console.error('Send message error:', error);
      if (error instanceof z.ZodError) {
        sendEvent('error', { content: 'Invalid input data' });
      } else {
        sendEvent('error', { content: 'Internal server error' });
      }
      // If conversation creation failed, ensure we don't try to delete it
      if (isNewConversation && conversationCreatedSuccessfully) {
        // If the conversation was created but then an error occurred before
        // any messages were saved, it might be an empty conversation.
        // For now, we let it persist as per user's request to allow retries.
      }
    } finally {
      res.end(); // Close the connection
    }
  }

  static async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const conversations = await ConversationService.getUserConversations(userId);
      res.json({ conversations });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  }

  static async getConversationMessages(req: AuthRequest, res: Response) {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;

      // Verify conversation belongs to user
      const conversation = await ConversationService.getConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const messages = await MessageService.getConversationMessages(conversationId);
      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
}

