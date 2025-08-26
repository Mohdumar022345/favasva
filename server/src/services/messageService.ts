import { supabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';

export class MessageService {
  static async createMessage(conversationId: string, content: string, role: 'user' | 'assistant'): Promise<Message> {
    const messageId = uuidv4();
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        content,
        role
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create message');
    }

    return data;
  }

  static async getConversationMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error('Failed to fetch messages');
    }

    return data || [];
  }
}