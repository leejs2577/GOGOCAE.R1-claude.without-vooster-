'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Message, AnalysisRequest } from '@/lib/supabase/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Send, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [request, setRequest] = useState<AnalysisRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    fetchRequest();
    fetchMessages();

    const channel = supabase
      .channel(`chat:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, requestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('analysis_requests')
        .select(`
          *,
          requester:users!requester_id(*),
          assigned_user:users!assigned_to(*),
          vehicle_model:vehicle_models(*)
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('요청 로딩 실패:', error);
      toast({
        title: '오류',
        description: '요청 정보를 불러올 수 없습니다.',
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, user:users(*)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error('메시지 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        request_id: requestId,
        user_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      const participants = [request?.requester_id, request?.assigned_to].filter(
        (id) => id && id !== user.id
      );

      if (participants.length > 0) {
        const notifications = participants.map((userId) => ({
          user_id: userId!,
          type: 'new_message',
          title: '새 메시지',
          content: `${user.name}님이 메시지를 보냈습니다: ${newMessage.slice(0, 50)}${
            newMessage.length > 50 ? '...' : ''
          }`,
          request_id: requestId,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: '메시지 전송 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">요청을 찾을 수 없습니다.</p>
        <Button onClick={() => router.back()} className="mt-4">
          돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/requests/${requestId}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{request.analysis_name}</h1>
          <p className="text-sm text-muted-foreground">
            {request.vehicle_model?.name} | {request.requester?.name}
          </p>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>채팅</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>아직 메시지가 없습니다.</p>
              <p className="text-sm mt-2">첫 메시지를 보내보세요!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.user_id === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {message.user?.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex flex-col ${isOwn ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.user?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), 'PPp', { locale: ko })}
                      </span>
                    </div>

                    <div
                      className={`px-4 py-2 rounded-lg max-w-md ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
