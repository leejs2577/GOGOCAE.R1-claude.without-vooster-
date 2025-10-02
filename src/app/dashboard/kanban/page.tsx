'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisRequest, RequestStatus } from '@/lib/supabase/types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Link from 'next/link';
import { getStatusLabel, getStatusColor } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const COLUMNS: { id: RequestStatus; title: string }[] = [
  { id: 'pending_assignment', title: '담당자 지정 필요' },
  { id: 'before_start', title: '작업 전' },
  { id: 'in_progress', title: '진행 중' },
  { id: 'completed', title: '완료' },
];

export default function KanbanPage() {
  const { user, isManager } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchRequests();

    const channel = supabase
      .channel('analysis_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('analysis_requests')
        .select(`
          *,
          requester:users!requester_id(*),
          assigned_user:users!assigned_to(*),
          vehicle_model:vehicle_models(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRequests(data);
    } catch (error) {
      console.error('요청 로딩 실패:', error);
      toast({
        title: '오류',
        description: '요청 목록을 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as RequestStatus;
    const requestId = draggableId;
    const request = requests.find((r) => r.id === requestId);

    if (!request) return;

    if (!request.assigned_to && newStatus !== 'pending_assignment') {
      toast({
        title: '담당자 미지정',
        description: '담당자를 먼저 지정해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const optimisticRequests = requests.map((r) =>
      r.id === requestId ? { ...r, status: newStatus } : r
    );
    setRequests(optimisticRequests);

    try {
      const updates: any = { status: newStatus };

      if (newStatus === 'in_progress' && !request.started_date) {
        updates.started_date = new Date().toISOString();
      } else if (newStatus === 'completed' && !request.completed_date) {
        updates.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('analysis_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('status_history').insert({
        request_id: requestId,
        changed_by: user.id,
        from_status: request.status,
        to_status: newStatus,
      });

      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        type: 'status_change',
        title: '상태 변경',
        content: `${request.analysis_name} 요청의 상태가 "${getStatusLabel(newStatus)}"로 변경되었습니다.`,
        request_id: requestId,
      });

      toast({
        title: '상태 변경 완료',
        description: `"${getStatusLabel(newStatus)}"로 변경되었습니다.`,
      });
    } catch (error: any) {
      fetchRequests();
      toast({
        title: '상태 변경 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getColumnRequests = (status: RequestStatus) => {
    return requests.filter((r) => r.status === status);
  };

  if (!isManager) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">이 페이지는 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">칸반 보드</h1>
        <p className="text-muted-foreground mt-2">
          드래그 앤 드롭으로 요청 상태를 관리하세요
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((column) => (
            <div key={column.id} className="space-y-3">
              <div
                className="p-3 rounded-lg font-semibold text-sm"
                style={{ backgroundColor: getStatusColor(column.id) + '20' }}
              >
                <div className="flex items-center justify-between">
                  <span>{column.title}</span>
                  <span className="bg-background px-2 py-0.5 rounded-full text-xs">
                    {getColumnRequests(column.id).length}
                  </span>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[400px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-muted' : ''
                    }`}
                  >
                    {getColumnRequests(column.id).map((request, index) => (
                      <Draggable
                        key={request.id}
                        draggableId={request.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Link href={`/dashboard/requests/${request.id}`}>
                              <Card
                                className={`cursor-pointer hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <CardContent className="p-4 space-y-3">
                                  <h3 className="font-medium text-sm line-clamp-2">
                                    {request.analysis_name}
                                  </h3>

                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <p>🚗 {request.vehicle_model?.name}</p>
                                    <p>👤 {request.requester?.name}</p>
                                    {request.assigned_user && (
                                      <p>🔧 {request.assigned_user.name}</p>
                                    )}
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(request.request_date), 'MM/dd', {
                                      locale: ko,
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {getColumnRequests(column.id).length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        요청이 없습니다
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
