'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">프로필</h1>
        <p className="text-muted-foreground mt-2">내 계정 정보</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-2xl">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">부서</p>
              <p className="font-medium">{user.department}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">역할</p>
              <div className="mt-1">
                <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                  {user.role === 'manager' ? '해석자 (Manager)' : '설계자 (Client)'}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">가입일</p>
              <p className="font-medium">
                {format(new Date(user.created_at), 'PPP', { locale: ko })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>권한</CardTitle>
          <CardDescription>현재 계정으로 사용 가능한 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {user.role === 'manager' ? (
              <>
                <li>✅ 모든 해석 요청 조회</li>
                <li>✅ 담당자 지정 및 상태 변경</li>
                <li>✅ 칸반 보드 및 캘린더 뷰</li>
                <li>✅ 차종 관리</li>
                <li>✅ 보고서 업로드</li>
                <li>✅ 채팅 참여</li>
              </>
            ) : (
              <>
                <li>✅ 해석 요청 등록</li>
                <li>✅ 내 요청 진행 상황 조회</li>
                <li>✅ 완료 보고서 다운로드</li>
                <li>✅ 담당자와 채팅</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
