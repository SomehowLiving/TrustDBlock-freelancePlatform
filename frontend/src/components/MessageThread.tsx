import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CommunicationData } from '@/types';
import { useAuthStore } from '@store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Send, Paperclip, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessageThreadProps {
  communication: CommunicationData;
  onSendMessage?: (message: string) => void;
}

export function MessageThread({ communication, onSendMessage }: MessageThreadProps) {
  const { user } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const { sendMessage } = useWebSocket();

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      sender: {
        wallet: user.address,
        displayName: user.username,
        role: user.role
      },
      message: {
        content: newMessage.trim(),
        type: 'text'
      }
    };

    // Send via WebSocket
    sendMessage({
      type: 'send_message',
      communicationId: communication.id,
      messageData
    });

    // Call parent callback if provided
    onSendMessage?.(newMessage.trim());
    
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUnreadCount = (wallet: string) => {
    return communication.summary.unreadCounts.find(uc => uc.wallet === wallet)?.count || 0;
  };

  return (
    <Card className="h-full flex flex-col" data-testid={`card-message-thread-${communication.id}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" data-testid={`text-thread-title-${communication.id}`}>
            Project Communication
          </CardTitle>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {communication.participants.map((participant, index) => (
            <div key={participant.wallet} className="flex items-center space-x-1">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {participant.displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{participant.displayName}</span>
              <Badge variant="secondary" className="text-xs">
                {participant.role}
              </Badge>
              {index < communication.participants.length - 1 && (
                <span className="text-muted-foreground">•</span>
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {communication.thread.length === 0 ? (
              <div className="text-center text-muted-foreground py-8" data-testid="text-no-messages">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              communication.thread.map((message, index) => {
                const isCurrentUser = message.sender.wallet.toLowerCase() === user?.address.toLowerCase();
                const isConsecutive = index > 0 && 
                  communication.thread[index - 1].sender.wallet === message.sender.wallet;

                return (
                  <div 
                    key={message.id} 
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.id}`}
                  >
                    <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                      {!isConsecutive && (
                        <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          {!isCurrentUser && (
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {message.sender.displayName[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {message.sender.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      
                      <div 
                        className={`p-3 rounded-lg ${
                          isCurrentUser 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.message.content}</p>
                        
                        {message.message.attachments && message.message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.message.attachments.map((attachment, i) => (
                              <div key={i} className="flex items-center space-x-2 text-xs">
                                <Paperclip className="w-3 h-3" />
                                <span>{attachment.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {message.edited.isEdited && (
                          <p className="text-xs opacity-70 mt-1">(edited)</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" data-testid="button-attach-file">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              data-testid="input-message"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
