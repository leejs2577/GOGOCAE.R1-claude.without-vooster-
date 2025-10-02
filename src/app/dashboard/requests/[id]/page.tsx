'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, getStatusLabel } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisRequest, User } from '@/lib/supabase/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Calendar,
  User as UserIcon,
  Car,
  FileText,
  Download,
  Upload,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { user, isManager } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [request, setRequest] = useState<AnalysisRequest | null>(null);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequest();
    if (isManager) {
      fetchManagers();
    }
  }, [requestId, isManager]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'manager')
      .order('name');

    if (data) {
      setManagers(data);
    }
  };

  const handleAssignManager = async (managerId: string) => {
    if (!request) return;

    setUpdating(true);
    try {
      const updates: any = {
        assigned_to: managerId,
        assigned_date: new Date().toISOString(),
      };

      if (request.status === 'pending_assignment') {
        updates.status = 'before_start';
      }

      const { error } = await supabase
        .from('analysis_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('status_history').insert({
        request_id: requestId,
        changed_by: user!.id,
        from_status: request.status,
        to_status: updates.status || request.status,
      });

      await supabase.from('notifications').insert([
        {
          user_id: managerId,
          type: 'assignment',
          title: '담당자로 지정됨',
          content: `${request.analysis_name} 요청의 담당자로 지정되었습니다.`,
          request_id: requestId,
        },
        {
          user_id: request.requester_id,
          type: 'assignment',
          title: '담당자 지정 완료',
          content: `${request.analysis_name} 요청에 담당자가 지정되었습니다.`,
          request_id: requestId,
        },
      ]);

      toast({
        title: '담당자 지정 완료',
        description: '담당자가 성공적으로 지정되었습니다.',
      });

      fetchRequest();
    } catch (error: any) {
      toast({
        title: '담당자 지정 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!request || !user) return;

    if (!request.assigned_to && newStatus !== 'pending_assignment') {
      toast({
        title: '담당자 미지정',
        description: '담당자를 먼저 지정해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
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
        content: `${request.analysis_name} 요청의 상태가 "${getStatusLabel(newStatus as any)}"로 변경되었습니다.`,
        request_id: requestId,
      });

      toast({
        title: '상태 변경 완료',
        description: '요청 상태가 성공적으로 변경되었습니다.',
      });

      fetchRequest();
    } catch (error: any) {
      toast({
        title: '상태 변경 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleFileDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{request.analysis_name}</h1>
          <p className="text-muted-foreground mt-2">요청 ID: {request.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 기본 정보 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Car className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">차종</p>
                  <p className="font-medium">{request.vehicle_model?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">요청자</p>
                  <p className="font-medium">
                    {request.requester?.name} ({request.requester?.department})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">요청일</p>
                  <p className="font-medium">
                    {format(new Date(request.request_date), 'PPP', { locale: ko })}
                  </p>
                </div>
              </div>

              {request.assigned_user && (
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">담당자</p>
                    <p className="font-medium">{request.assigned_user.name}</p>
                  </div>
                </div>
              )}
            </div>

            {request.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">상세 설명</p>
                  <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                </div>
              </>
            )}

            {request.design_files && request.design_files.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">설계 파일</p>
                  <div className="space-y-2">
                    {request.design_files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileDownload(file.url, file.name)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {request.report_file_url && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">완료 보고서</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleFileDownload(request.report_file_url!, '보고서.pdf')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    보고서 다운로드
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 작업 관리 */}
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle>작업 관리</CardTitle>
              <CardDescription>담당자 지정 및 상태 변경</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">담당자</label>
                <Select
                  value={request.assigned_to || 'unassigned'}
                  onValueChange={handleAssignManager}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">미지정</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">상태</label>
                <Select
                  value={request.status}
                  onValueChange={handleStatusChange}
                  disabled={updating || !request.assigned_to}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_assignment">담당자 지정 필요</SelectItem>
                    <SelectItem value="before_start">작업 전</SelectItem>
                    <SelectItem value="in_progress">진행 중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
                {!request.assigned_to && (
                  <p className="text-xs text-muted-foreground">
                    담당자를 먼저 지정해주세요
                  </p>
                )}
              </div>

              <Separator />

              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/requests/${requestId}/chat`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  채팅방 입장
                </Link>
              </Button>

              {request.status === 'in_progress' && (
                <Button asChild className="w-full">
                  <Link href={`/dashboard/requests/${requestId}/report`}>
                    <Upload className="w-4 h-4 mr-2" />
                    보고서 업로드
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 클라이언트 뷰 */}
        {!isManager && (
          <Card>
            <CardHeader>
              <CardTitle>작업 현황</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.assigned_user && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">담당자</p>
                  <p className="font-medium">{request.assigned_user.name}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">현재 상태</p>
                <StatusBadge status={request.status} />
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link href={`/dashboard/requests/${requestId}/chat`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  채팅방 입장
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
