import React from 'react';
import { User, Bot } from 'lucide-react';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 p-4 ${isUser ? 'bg-transparent' : 'bg-gray-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
      }`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose max-w-none">
          <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;