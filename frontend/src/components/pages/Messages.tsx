import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  Video,
  Star,
  CheckCircle
} from 'lucide-react';

export const Messages: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const conversations = [
    {
      id: 1,
      name: 'TechCorp Inc.',
      lastMessage: 'Thanks for the update on the smart contract development. Looking forward to the next milestone.',
      timestamp: '2 mins ago',
      unreadCount: 0,
      avatar: 'TC',
      online: true,
      project: 'DeFi Trading Platform',
    },
    {
      id: 2,
      name: 'HealthTech Solutions',
      lastMessage: 'Can we schedule a call to discuss the mobile app features?',
      timestamp: '1 hour ago',
      unreadCount: 2,
      avatar: 'HS',
      online: false,
      project: 'Healthcare Mobile App',
    },
    {
      id: 3,
      name: 'CryptoAnalytics',
      lastMessage: 'The analytics dashboard looks great! Just a few minor adjustments needed.',
      timestamp: '3 hours ago',
      unreadCount: 0,
      avatar: 'CA',
      online: true,
      project: 'Analytics Platform',
    },
  ];

  const messages = [
    {
      id: 1,
      sender: 'client',
      name: 'TechCorp Inc.',
      message: 'Hi Sarah! Hope you\'re doing well. I wanted to check in on the progress of the smart contract development.',
      timestamp: '10:30 AM',
      type: 'text',
    },
    {
      id: 2,
      sender: 'me',
      name: 'You',
      message: 'Hello! Great to hear from you. I\'ve made excellent progress on the smart contracts. The core trading functionality is complete and I\'m currently working on the yield farming mechanisms.',
      timestamp: '10:35 AM',
      type: 'text',
    },
    {
      id: 3,
      sender: 'me',
      name: 'You',
      message: 'I\'ve also completed the initial security tests and everything looks solid. Would you like me to share a preview of the current implementation?',
      timestamp: '10:36 AM',
      type: 'text',
    },
    {
      id: 4,
      sender: 'client',
      name: 'TechCorp Inc.',
      message: 'That sounds fantastic! Yes, I\'d love to see a preview. Also, could you provide an updated timeline for the remaining milestones?',
      timestamp: '10:45 AM',
      type: 'text',
    },
    {
      id: 5,
      sender: 'me',
      name: 'You',
      message: 'Absolutely! I\'ll prepare a demo and send you the updated timeline by end of day. The current pace suggests we\'ll finish ahead of schedule.',
      timestamp: '11:00 AM',
      type: 'text',
    },
    {
      id: 6,
      sender: 'client',
      name: 'TechCorp Inc.',
      message: 'Thanks for the update on the smart contract development. Looking forward to the next milestone.',
      timestamp: '2 mins ago',
      type: 'text',
    },
  ];

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // Add message logic here
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversation === conversation.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {conversation.avatar}
                  </div>
                  {conversation.online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{conversation.name}</h3>
                    <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{conversation.project}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{conversation.lastMessage}</p>
                </div>
                
                {conversation.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">{conversation.unreadCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedConv.avatar}
                </div>
                {selectedConv.online && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <h2 className="font-medium text-gray-900">{selectedConv.name}</h2>
                <p className="text-sm text-gray-600">{selectedConv.project}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.sender === 'me' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                } rounded-lg p-3`}>
                  <p className="text-sm">{message.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${
                      message.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp}
                    </span>
                    {message.sender === 'me' && (
                      <CheckCircle className="w-3 h-3 text-blue-100" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <button
                type="button"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
            <p className="text-gray-600">Choose a conversation from the left to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};