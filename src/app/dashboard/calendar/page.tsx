'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format as formatDate, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import type { AnalysisRequest } from '@/lib/supabase/types';
import { getStatusColor, getStatusLabel } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const locales = {
  ko: ko,
};

const localizer = dateFnsLocalizer({
  format: formatDate,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: AnalysisRequest;
}

export default function CalendarPage() {
  const { user, isManager } = useAuth();
  const supabase = createClient();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    fetchRequests();
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
        .order('request_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const calendarEvents: CalendarEvent[] = data.map((request) => ({
          id: request.id,
          title: `${request.analysis_name} (${request.vehicle_model?.name})`,
          start: new Date(request.request_date),
          end: new Date(request.request_date),
          resource: request,
        }));

        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('요청 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = getStatusColor(event.resource.status);

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const messages = {
    allDay: '종일',
    previous: '이전',
    next: '다음',
    today: '오늘',
    month: '월',
    week: '주',
    day: '일',
    agenda: '일정',
    date: '날짜',
    time: '시간',
    event: '이벤트',
    noEventsInRange: '이 기간에 일정이 없습니다.',
    showMore: (total: number) => `+${total} 더보기`,
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
        <h1 className="text-3xl font-bold">캘린더</h1>
        <p className="text-muted-foreground mt-2">
          월간 일정을 확인하고 해석 요청을 관리하세요
        </p>
      </div>

      <div className="bg-card rounded-lg p-4 shadow-sm" style={{ height: '700px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          messages={messages}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.resource.analysis_name}</DialogTitle>
                <DialogDescription>해석 요청 상세 정보</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">차종</p>
                    <p className="font-medium">
                      {selectedEvent.resource.vehicle_model?.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">상태</p>
                    <p className="font-medium">
                      {getStatusLabel(selectedEvent.resource.status)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">요청자</p>
                    <p className="font-medium">
                      {selectedEvent.resource.requester?.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">담당자</p>
                    <p className="font-medium">
                      {selectedEvent.resource.assigned_user?.name || '미지정'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">요청일</p>
                    <p className="font-medium">
                      {format(
                        new Date(selectedEvent.resource.request_date),
                        'PPP',
                        { locale: ko }
                      )}
                    </p>
                  </div>

                  {selectedEvent.resource.completed_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">완료일</p>
                      <p className="font-medium">
                        {format(
                          new Date(selectedEvent.resource.completed_date),
                          'PPP',
                          { locale: ko }
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {selectedEvent.resource.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">상세 설명</p>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedEvent.resource.description}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard/requests/${selectedEvent.resource.id}`}>
                      상세 페이지로 이동
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
