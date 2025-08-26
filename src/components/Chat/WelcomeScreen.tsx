import React from 'react';
import { MessageCircle, Zap, Shield, Globe } from 'lucide-react';

const WelcomeScreen: React.FC = () => {
  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Natural Conversations',
      description: 'Chat naturally with our AI assistant powered by Google Gemini'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Get instant responses to your questions and requests'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Your conversations are encrypted and stored securely'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Always Available',
      description: 'Access your AI assistant anytime, anywhere'
    }
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to AI Chat
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start a conversation with our intelligent AI assistant. Ask questions, get help, or just chat!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="text-blue-600 mb-3">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-gray-500 text-sm">
          Start typing below to begin your conversation
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;