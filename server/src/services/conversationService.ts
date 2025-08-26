// server/src/services/conversationService.ts
import { supabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../types';

export class ConversationService {
  static async createConversation(userId: string, title: string): Promise<Conversation> {
    const conversationId = uuidv4();
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        title: title || 'New Conversation'
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create conversation');
    }

    return data;
  }

  static async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch conversations');
    }

    return data || [];
  }

  static async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  static async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      throw new Error('Failed to update conversation title');
    }
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      throw new Error(`Failed to delete conversation ${conversationId}`);
    }
  }
}
