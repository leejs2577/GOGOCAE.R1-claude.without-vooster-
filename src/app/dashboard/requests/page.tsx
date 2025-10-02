'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import type { AnalysisRequest, VehicleModel, User } from '@/lib/supabase/types';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function RequestsPage() {
  const { user, isManager } = useAuth();
  const [requests, setRequests] = useState<AnalysisRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AnalysisRequest[]>([]);
  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        let query = supabase
          .from('analysis_requests')
          .select(`
            *,
            requester:users!requester_id(*),
            assigned_user:users!assigned_to(*),
            vehicle_model:vehicle_models(*)
          `);

        if (!isManager) {
          query = query.eq('requester_id', user.id);
        }

        const { data: requestsData } = await query.order('created_at', { ascending: false });

        if (requestsData) {
          setRequests(requestsData);
          setFilteredRequests(requestsData);
        }

        const { data: vehiclesData } = await supabase
          .from('vehicle_models')
          .select('*')
          .order('name');

        if (vehiclesData) {
          setVehicles(vehiclesData);
        }

        if (isManager) {
          const { data: managersData } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'manager')
            .order('name');

          if (managersData) {
            setManagers(managersData);
          }
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isManager, supabase]);

  useEffect(() => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.analysis_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.requester?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (vehicleFilter !== 'all') {
      filtered = filtered.filter((r) => r.vehicle_model_id === vehicleFilter);
    }

    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        filtered = filtered.filter((r) => !r.assigned_to);
      } else {
        filtered = filtered.filter((r) => r.assigned_to === assigneeFilter);
      }
    }

    setFilteredRequests(filtered);
  }, [searchTerm, statusFilter, vehicleFilter, assigneeFilter, requests]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">해석 요청</h1>
          <p className="text-muted-foreground mt-2">
            {isManager ? '전체 해석 요청 목록' : '내 해석 요청 목록'}
          </p>
        </div>
        {!isManager && (
          <Button asChild>
            <Link href="/dashboard/requests/new">
              <Plus className="w-4 h-4 mr-2" />
              새 요청 등록
            </Link>
          </Button>
        )}
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">검색</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="요청명, 요청자 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">상태</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending_assignment">담당자 지정 필요</SelectItem>
                  <SelectItem value="before_start">작업 전</SelectItem>
                  <SelectItem value="in_progress">진행 중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">차종</label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isManager && (
              <div className="space-y-2">
                <label className="text-sm font-medium">담당자</label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="unassigned">미지정</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 요청 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">요청명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">차종</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">요청자</th>
                  {isManager && (
                    <th className="px-4 py-3 text-left text-sm font-medium">담당자</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium">요청일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isManager ? 7 : 6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      요청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/requests/${request.id}`}
                          className="font-medium hover:underline"
                        >
                          {request.analysis_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.vehicle_model?.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.requester?.name}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-sm">
                          {request.assigned_user?.name || (
                            <span className="text-muted-foreground">미지정</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(request.request_date), 'PPP', { locale: ko })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/requests/${request.id}`}>
                            상세보기
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        총 {filteredRequests.length}개의 요청
      </div>
    </div>
  );
}
