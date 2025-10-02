'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { AnalysisRequest } from '@/lib/supabase/types';
import { Upload, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReportUploadPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { user, isManager } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [request, setRequest] = useState<AnalysisRequest | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReportFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportFile || !user || !request) return;

    setUploading(true);

    try {
      const fileExt = reportFile.name.split('.').pop();
      const fileName = `reports/${requestId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('design-files')
        .upload(fileName, reportFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('design-files')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('analysis_requests')
        .update({
          report_file_url: urlData.publicUrl,
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      await supabase.from('status_history').insert({
        request_id: requestId,
        changed_by: user.id,
        from_status: request.status,
        to_status: 'completed',
      });

      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        type: 'report_uploaded',
        title: '보고서 업로드 완료',
        content: `${request.analysis_name} 요청의 보고서가 업로드되었습니다.`,
        request_id: requestId,
      });

      toast({
        title: '보고서 업로드 완료',
        description: '요청이 완료 상태로 변경되었습니다.',
      });

      router.push(`/dashboard/requests/${requestId}`);
    } catch (error: any) {
      console.error('보고서 업로드 실패:', error);
      toast({
        title: '보고서 업로드 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/requests/${requestId}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">보고서 업로드</h1>
          <p className="text-sm text-muted-foreground">{request.analysis_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>완료 보고서</CardTitle>
            <CardDescription>
              해석 결과 보고서를 업로드하면 요청이 완료 상태로 변경됩니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="report-file">
                보고서 파일 <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  id="report-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                <label
                  htmlFor="report-file"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  {reportFile ? (
                    <>
                      <FileText className="w-12 h-12 text-primary" />
                      <div>
                        <p className="font-medium">{reportFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(reportFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm">
                        파일 변경
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">클릭하여 파일 선택</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          PDF, Word, PowerPoint 파일 지원
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">추가 메모 (선택)</Label>
              <Textarea
                id="notes"
                placeholder="보고서에 대한 추가 설명을 입력하세요"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={uploading || !reportFile} className="flex-1">
                {uploading ? '업로드 중...' : '보고서 업로드 및 완료 처리'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={uploading}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
