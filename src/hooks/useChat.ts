// src/hooks/useChat.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Removed useMutation
import api from '../lib/api';
import { Conversation, Message } from '../types'; // Removed SendMessageRequest, SendMessageResponse
// Removed uuid import as it's no longer needed here

export const useConversations = () => {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await api.get('/chat/conversations');
      return response.data.conversations as Conversation[];
    },
  });
};

export const useConversationMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      return response.data.messages as Message[];
    },
    enabled: !!conversationId,
  });
};

// The useSendMessage hook is removed entirely as its functionality is replaced by useChatStream.
