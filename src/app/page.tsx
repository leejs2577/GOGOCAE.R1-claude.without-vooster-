'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, KanbanSquare, Users, FileText } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
            GOGOCAE
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
            설계자와 CAE 해석자를 연결하는 효율적인 해석 요청 관리 플랫폼
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                로그인
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup">회원가입</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="해석 요청 관리"
            description="설계 파일 업로드부터 완료 보고서까지 체계적으로 관리"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="담당자 지정"
            description="해석자를 지정하고 실시간으로 진행 상황 추적"
          />
          <FeatureCard
            icon={<KanbanSquare className="w-8 h-8" />}
            title="칸반 보드"
            description="직관적인 드래그 앤 드롭으로 업무 상태 관리"
          />
          <FeatureCard
            icon={<CalendarDays className="w-8 h-8" />}
            title="캘린더 뷰"
            description="월간 일정 시각화로 효율적인 스케줄 관리"
          />
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center space-y-4">
          <h2 className="text-3xl font-bold">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground">
            설계자와 해석자의 효율적인 협업을 경험해보세요
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 p-6 bg-card rounded-lg border">
      <div className="text-primary">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
