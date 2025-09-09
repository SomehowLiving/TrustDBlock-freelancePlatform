import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageThread } from '@/components/MessageThread';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CommunicationData } from '@/types';
import { 
  MessageCircle, 
  Search, 
  Plus, 
  Users, 
  Clock,
  CheckCircle,
  Dot
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCommunication, setSelectedCommunication] = useState<CommunicationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: communications, isLoading } = useQuery({
    queryKey: ['/api/communications/my'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // WebSocket connection for real-time messages
  const { sendMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'new_message') {
        // Refresh communications when new message received
        queryClient.invalidateQueries({ queryKey: ['/api/communications/my'] });
        
        // Update selected communication if it matches
        if (selectedCommunication && data.communicationId === selectedCommunication.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/communications', data.communicationId] });
        }
      }
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ communicationId, message }: { communicationId: string, message: string }) => {
      // Send via WebSocket for real-time delivery
      sendMessage({
        type: 'send_message',
        communicationId,
        messageData: {
          sender: {
            wallet: user?.address || '',
            displayName: user?.username || '',
            role: user?.role || ''
          },
          message: {
            content: message,
            type: 'text'
          }
        }
      });
      
      // Also update via API for persistence
      const response = await apiRequest('PUT', `/api/communications/${communicationId}`, {
        thread: [...(selectedCommunication?.thread || []), {
          id: Math.random().toString(36).substr(2, 9),
          sender: {
            wallet: user?.address || '',
            displayName: user?.username || '',
            role: user?.role || ''
          },
          message: {
            content: message,
            type: 'text'
          },
          timestamp: new Date().toISOString(),
          edited: { isEdited: false },
          metadata: { readBy: [] }
        }]
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communications/my'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const filteredCommunications = communications?.filter((comm: CommunicationData) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      comm.participants.some(p => p.displayName.toLowerCase().includes(searchLower)) ||
      comm.summary.lastMessage?.content.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getUnreadCount = (communication: CommunicationData) => {
    return communication.summary.unreadCounts.find(uc => 
      uc.wallet.toLowerCase() === user?.address?.toLowerCase()
    )?.count || 0;
  };

  const getOtherParticipants = (communication: CommunicationData) => {
    return communication.participants.filter(p => 
      p.wallet.toLowerCase() !== user?.address?.toLowerCase()
    );
  };

  const handleSendMessage = (message: string) => {
    if (selectedCommunication) {
      sendMessageMutation.mutate({
        communicationId: selectedCommunication.id,
        message
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Login Required</h3>
            <p className="text-muted-foreground">
              Please log in to access your messages.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-[calc(100vh-8rem)]" data-testid="messages-container">
      <div className="grid lg:grid-cols-12 gap-6 h-full">
        {/* Conversations List */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="h-full flex flex-col" data-testid="card-conversations-list">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Messages
                </CardTitle>
                <Button size="sm" variant="outline" data-testid="button-new-message">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="p-4 space-y-4" data-testid="conversations-loading">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-3 p-3">
                          <div className="w-10 h-10 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredCommunications.length > 0 ? (
                  <div className="space-y-1 p-2">
                    {filteredCommunications.map((communication: CommunicationData) => {
                      const otherParticipants = getOtherParticipants(communication);
                      const unreadCount = getUnreadCount(communication);
                      const isSelected = selectedCommunication?.id === communication.id;

                      return (
                        <div
                          key={communication.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-accent text-accent-foreground' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedCommunication(communication)}
                          data-testid={`conversation-item-${communication.id}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback>
                                  {otherParticipants[0]?.displayName[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-xs text-primary-foreground font-medium">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium truncate" data-testid={`text-conversation-name-${communication.id}`}>
                                  {otherParticipants.map(p => p.displayName).join(', ') || 'Unknown'}
                                </h4>
                                {communication.summary.lastMessage && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(communication.summary.lastMessage.timestamp), { addSuffix: true })}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1">
                                {otherParticipants.map((participant, index) => (
                                  <Badge key={participant.wallet} variant="secondary" className="text-xs">
                                    {participant.role}
                                  </Badge>
                                ))}
                              </div>

                              {communication.summary.lastMessage && (
                                <p className="text-sm text-muted-foreground truncate mt-1" data-testid={`text-last-message-${communication.id}`}>
                                  {communication.summary.lastMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-conversations">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-foreground mb-2">No Conversations</h3>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? 'No conversations match your search' : 'Start working on projects to begin messaging'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-8">
          {selectedCommunication ? (
            <MessageThread 
              communication={selectedCommunication}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <Card className="h-full" data-testid="card-no-conversation-selected">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Select a Conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the sidebar to start messaging
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
