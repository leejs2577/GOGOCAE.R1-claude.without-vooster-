'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { AnalysisRequest } from '@/lib/supabase/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [recentRequests, setRecentRequests] = useState<AnalysisRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        let query = supabase
          .from('analysis_requests')
          .select('*, requester:users!requester_id(*), assigned_user:users!assigned_to(*), vehicle_model:vehicle_models(*)');

        if (!isManager) {
          query = query.eq('requester_id', user.id);
        }

        const { data: requests } = await query.order('created_at', { ascending: false });

        if (requests) {
          setStats({
            total: requests.length,
            pending: requests.filter((r) => r.status === 'pending_assignment').length,
            inProgress: requests.filter(
              (r) => r.status === 'before_start' || r.status === 'in_progress'
            ).length,
            completed: requests.filter((r) => r.status === 'completed').length,
          });

          setRecentRequests(requests.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isManager, supabase]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground mt-2">
          {isManager ? '전체 해석 요청 현황' : '내 해석 요청 현황'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 요청"
          value={stats.total}
          icon={<FileText className="w-4 h-4" />}
        />
        <StatsCard
          title="담당자 지정 필요"
          value={stats.pending}
          icon={<AlertCircle className="w-4 h-4" />}
          variant="warning"
        />
        <StatsCard
          title="진행 중"
          value={stats.inProgress}
          icon={<Clock className="w-4 h-4" />}
          variant="info"
        />
        <StatsCard
          title="완료"
          value={stats.completed}
          icon={<CheckCircle className="w-4 h-4" />}
          variant="success"
        />
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>최근 요청</CardTitle>
            <CardDescription>최근 등록된 해석 요청 목록</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/requests">전체 보기</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              등록된 요청이 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{request.analysis_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.vehicle_model?.name} |{' '}
                        {request.requester?.name}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!isManager && (
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/requests/new">새 해석 요청 등록</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'info' | 'success';
}) {
  const variantStyles = {
    default: 'text-foreground',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    success: 'text-green-600',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={variantStyles[variant]}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

