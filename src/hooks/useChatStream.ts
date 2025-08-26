// src/hooks/useChatStream.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message, StreamEventData, StreamEventType, Conversation } from '../types';
import { v4 as uuidv4 } from 'uuid';
import api from '../lib/api';
import { NavigateFunction } from 'react-router-dom';
import { useConversationMessages } from '../hooks/useChat'; // Import useConversationMessages

interface UseChatStreamResult {
  messages: Message[];
  isAITyping: boolean;
  sendMessage: (content: string, currentConversationId?: string) => Promise<void>;
  isLoadingMessages: boolean;
}

export const useChatStream = (initialConversationId: string | null, navigate: NavigateFunction): UseChatStreamResult => {
  const queryClient = useQueryClient();
  
  // Use useConversationMessages to fetch historical messages and manage loading state
  const { data: fetchedMessages, isLoading: isLoadingQuery } = useConversationMessages(initialConversationId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true); // Initialize with true, will be updated by useEffect

  const currentEventSourceRef = useRef<EventSource | null>(null);

  const currentConvIdRef = useRef<string | null>(initialConversationId);
  useEffect(() => {
    currentConvIdRef.current = initialConversationId;
  }, [initialConversationId]);

  // Effect to update local messages state and loading state when fetchedMessages or isLoadingQuery changes
  useEffect(() => {
    if (fetchedMessages !== undefined) { // Ensure data is not undefined (initial state before query runs)
      setMessages(fetchedMessages);
    } else {
      setMessages([]); // Clear messages if no conversation ID or no data yet
    }
    setIsLoadingMessages(isLoadingQuery);
  }, [fetchedMessages, isLoadingQuery, initialConversationId]); // Add initialConversationId as dependency to re-trigger when conversation changes

  const sendMessage = useCallback(async (content: string, currentConversationId?: string) => {
    setIsAITyping(true); // Set to true when message is sent
    
    // Optimistic update for user message
    const tempUserMessageId = uuidv4();
    const tempUserMessage: Message = {
      id: tempUserMessageId,
      conversation_id: currentConversationId || 'temp-new-conversation',
      content: content,
      role: 'user',
      created_at: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, tempUserMessage]);

    if (currentEventSourceRef.current) {
      currentEventSourceRef.current.close();
      currentEventSourceRef.current = null;
    }

    let finalConversationId: string | null = null;

    try {
      const response = await fetch(`${api.defaults.baseURL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ content, conversationId: currentConversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate chat stream');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get readable stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let eventEndIndex;
        while ((eventEndIndex = buffer.indexOf('\n\n')) !== -1) {
          const eventString = buffer.substring(0, eventEndIndex);
          buffer = buffer.substring(eventEndIndex + 2);

          const eventLines = eventString.split('\n');
          let eventType: StreamEventType | undefined;
          let eventData: StreamEventData | undefined;

          for (const line of eventLines) {
            if (line.startsWith('event: ')) {
              eventType = line.substring('event: '.length) as StreamEventType;
            } else if (line.startsWith('data: ')) {
              try {
                eventData = JSON.parse(line.substring('data: '.length));
              } catch (e) {
                console.error('Failed to parse event data:', e);
              }
            }
          }

          if (eventType && eventData) {
            if (eventType === 'initial' && eventData.userMessage) {
              setMessages((prevMessages) => {
                const filtered = prevMessages.filter(msg => msg.id !== tempUserMessageId);
                return [...filtered, eventData.userMessage!];
              });
              finalConversationId = eventData.conversationId || null;
              
              // Optimistically add new conversation to cache with isTitleGenerating true
              if (!currentConversationId && finalConversationId) {
                queryClient.setQueryData<Conversation[]>(['conversations'], (oldConversations) => {
                  const newConversation: Conversation = {
                    id: finalConversationId,
                    user_id: '', // This will be filled by actual data later, or fetched
                    title: 'New Chat', // Temporary title
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    isTitleGenerating: true, // Set to true for typing effect
                  };
                  // Add to the beginning of the list
                  return oldConversations ? [newConversation, ...oldConversations] : [newConversation];
                });
              }
              // Invalidate conversations to ensure the sidebar updates with the new conversation
              queryClient.invalidateQueries({ queryKey: ['conversations'] });

              if (finalConversationId && currentConvIdRef.current !== finalConversationId) {
                navigate(`/chat/${finalConversationId}`, { replace: true });
              }

            } else if (eventType === 'message' && eventData.chunk) {
              // Set isAITyping to false as soon as the first chunk arrives
              setIsAITyping(false); 

              const currentAssistantMessageId = eventData.id;

              if (!currentAssistantMessageId) {
                console.warn("Received message chunk without an ID. Skipping update.");
                continue;
              }

              setMessages((prevMessages) => {
                let found = false;
                const updatedMessages = prevMessages.map(msg => {
                  if (msg.id === currentAssistantMessageId && msg.role === 'assistant') {
                    found = true;
                    return { ...msg, content: msg.content + eventData.chunk! };
                  }
                  return msg;
                });

                if (!found) {
                  const newAssistantMessage: Message = {
                    id: currentAssistantMessageId,
                    conversation_id: eventData.conversationId || finalConversationId || currentConvIdRef.current || 'unknown',
                    content: eventData.chunk!,
                    role: 'assistant',
                    created_at: new Date().toISOString(),
                  };
                  return [...updatedMessages, newAssistantMessage];
                }
                return updatedMessages;
              });
            } else if (eventType === 'error' && eventData.content) {
              console.error('Stream error:', eventData.content);
              // Immediately hide typing indicator on error
              setIsAITyping(false);
              setMessages((prevMessages) => {
                const filtered = prevMessages.filter(msg => msg.id !== tempUserMessageId);
                return [...filtered, {
                  id: uuidv4(),
                  conversation_id: eventData.conversationId || finalConversationId || currentConvIdRef.current || 'unknown',
                  content: eventData.content!,
                  role: 'assistant',
                  created_at: new Date().toISOString(),
                }];
              });
              // Invalidate conversations to remove the "New Chat" entry if it was a new conversation that failed
              queryClient.invalidateQueries({ queryKey: ['conversations'] });

            } else if (eventType === 'done') {
              // Stream finished
            } else if (eventType === 'titleUpdate' && eventData.conversationId && eventData.newTitle) {
              // Update the conversation title in the Tanstack Query cache
              queryClient.setQueryData<Conversation[]>(['conversations'], (oldConversations) => {
                if (!oldConversations) return [];
                return oldConversations.map(conv => 
                  conv.id === eventData.conversationId ? { ...conv, title: eventData.newTitle!, isTitleGenerating: false } : conv
                );
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during streaming:', error);
      // Immediately hide typing indicator on error
      setIsAITyping(false);
      setMessages((prevMessages) => {
        const filtered = prevMessages.filter(msg => msg.id !== tempUserMessageId);
        return [...filtered, {
          id: uuidv4(),
          conversation_id: currentConversationId || currentConvIdRef.current || 'unknown',
          content: "I'm sorry, an unexpected error occurred. Please try again.",
          role: 'assistant',
          created_at: new Date().toISOString(),
        }];
      });
      // Invalidate conversations to remove the "New Chat" entry if it was a new conversation that failed
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } finally {
      setIsAITyping(false); 
      if (currentEventSourceRef.current) {
        currentEventSourceRef.current.close();
        currentEventSourceRef.current = null;
      }
      // Invalidate messages query for the current conversation to ensure it's up-to-date
      // This is important because the streaming process directly modifies the local state,
      // but the react-query cache for messages needs to be updated for future fetches.
      if (finalConversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', finalConversationId] });
      } else if (currentConversationId) {
        queryClient.invalidateQueries({ queryKey: ['messages', currentConversationId] });
      }
      // Also invalidate the currentConvIdRef.current in case it's a new conversation that just got its ID
      queryClient.invalidateQueries({ queryKey: ['messages', currentConvIdRef.current] });
    }
  }, [queryClient, navigate, fetchedMessages, isLoadingQuery]); // Added fetchedMessages and isLoadingQuery to dependencies

  return { messages, isAITyping, sendMessage, isLoadingMessages };
};
