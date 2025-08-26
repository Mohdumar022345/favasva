import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, LogOut, User } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useChat';
import { useQueryClient } from '@tanstack/react-query';
import AnimatedTitle from '../AnimatedTitle';

const LOCAL_STORAGE_KEY = 'animatedTitles';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();
  const queryClient = useQueryClient();

  // State to track which titles have completed their typing effect, persisted in localStorage
  const [hasTitleTyped, setHasTitleTyped] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error("Failed to parse animated titles from localStorage:", error);
      return new Set();
    }
  });

  // Effect to update localStorage whenever hasTitleTyped changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(hasTitleTyped)));
  }, [hasTitleTyped]);

  const handleNewChat = () => {
    queryClient.setQueryData(['messages', null], []);
    navigate('/');
    // No need to clear hasTitleTyped here, as a new conversation will have a new ID
    // that won't be in the set initially.
  };

  const handleAnimationComplete = (id: string) => {
    setHasTitleTyped(prev => new Set(prev).add(id));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <Plus size={18} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            conversations?.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/chat/${conversation.id}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors group ${
                  conversationId === conversation.id ? 'bg-gray-800' : ''
                }`}
              >
                <MessageCircle size={16} className="text-gray-400 group-hover:text-white" />
                {/* Added min-h-5 to ensure consistent height */}
                <span className="truncate text-sm min-h-5 flex items-center"> 
                  {/* Display "New Chat" while AI is generating title or if title is still temporary */}
                  {conversation.isTitleGenerating || conversation.title === "New Chat" ? (
                    <span className="text-gray-400">New Chat</span> 
                  ) : (
                    // Use AnimatedTitle only if the title hasn't been typed yet for this session or previously
                    // This condition ensures AnimatedTitle only mounts when the final title is ready
                    !hasTitleTyped.has(conversation.id) ? (
                      <AnimatedTitle
                        title={conversation.title}
                        onAnimationComplete={() => handleAnimationComplete(conversation.id)}
                      />
                    ) : (
                      // Otherwise, just display the static title
                      conversation.title
                    )
                  )}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
        >
          <LogOut size={16} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

