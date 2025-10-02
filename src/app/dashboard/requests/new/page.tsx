'use client';

import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { VehicleModel, DesignFile } from '@/lib/supabase/types';
import { Upload, X, FileIcon } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function NewRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [analysisName, setAnalysisName] = useState('');
  const [vehicleModelId, setVehicleModelId] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data } = await supabase
        .from('vehicle_models')
        .select('*')
        .order('name');

      if (data) {
        setVehicles(data);
      }
    };

    fetchVehicles();
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const uploadFiles = async (requestId: string): Promise<DesignFile[]> => {
    const uploadedFiles: DesignFile[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${requestId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('design-files')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('design-files')
        .getPublicUrl(fileName);

      uploadedFiles.push({
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
      });
    }

    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: '로그인이 필요합니다',
        description: '다시 로그인해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!analysisName.trim()) {
      toast({
        title: '해석명을 입력하세요',
        description: '해석명은 필수 항목입니다.',
        variant: 'destructive',
      });
      return;
    }

    if (!vehicleModelId) {
      toast({
        title: '차종을 선택하세요',
        description: '차종은 필수 항목입니다.',
        variant: 'destructive',
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: '파일이 필요합니다',
        description: '최소 1개 이상의 설계 파일을 업로드해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      console.log('요청 등록 시작:', { analysisName, vehicleModelId, fileCount: files.length });

      // 1. 요청 생성
      const { data: request, error: requestError } = await supabase
        .from('analysis_requests')
        .insert({
          requester_id: user.id,
          vehicle_model_id: vehicleModelId,
          analysis_name: analysisName,
          description: description || null,
          status: 'pending_assignment',
          request_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (requestError) {
        console.error('요청 생성 실패:', requestError);
        throw new Error(`요청 생성 실패: ${requestError.message}`);
      }

      console.log('요청 생성 성공:', request.id);

      // 2. 파일 업로드
      const uploadedFiles = await uploadFiles(request.id);
      console.log('파일 업로드 성공:', uploadedFiles.length);

      // 3. 요청에 파일 정보 업데이트
      const { error: updateError } = await supabase
        .from('analysis_requests')
        .update({ design_files: uploadedFiles })
        .eq('id', request.id);

      if (updateError) {
        console.error('파일 정보 업데이트 실패:', updateError);
        throw new Error(`파일 정보 업데이트 실패: ${updateError.message}`);
      }

      console.log('파일 정보 업데이트 성공');

      // 4. 매니저들에게 알림 전송
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'manager');

      if (managers && managers.length > 0) {
        const notifications = managers.map((manager) => ({
          user_id: manager.id,
          type: 'new_request',
          title: '새 해석 요청',
          content: `${user.name}님이 새로운 해석 요청을 등록했습니다: ${analysisName}`,
          request_id: request.id,
        }));

        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) {
          console.error('알림 전송 실패:', notifError);
        } else {
          console.log('알림 전송 성공:', managers.length);
        }
      }

      toast({
        title: '요청 등록 완료',
        description: '해석 요청이 성공적으로 등록되었습니다.',
      });

      console.log('페이지 이동:', `/dashboard/requests/${request.id}`);
      router.push(`/dashboard/requests/${request.id}`);
    } catch (error: any) {
      console.error('요청 등록 실패:', error);
      toast({
        title: '요청 등록 실패',
        description: error.message || '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
  const isLargeUpload = totalFileSize > MAX_FILE_SIZE;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">새 해석 요청</h1>
        <p className="text-muted-foreground mt-2">
          CAE 해석이 필요한 작업을 등록하세요
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>요청 정보</CardTitle>
            <CardDescription>해석 요청에 대한 상세 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="analysis-name">
                해석명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="analysis-name"
                placeholder="예: 차체 강성 해석"
                value={analysisName}
                onChange={(e) => setAnalysisName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle-model">
                차종 <span className="text-destructive">*</span>
              </Label>
              <Select value={vehicleModelId} onValueChange={setVehicleModelId} required>
                <SelectTrigger id="vehicle-model">
                  <SelectValue placeholder="차종을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  등록된 차종이 없습니다. 관리자에게 문의하세요.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">상세 설명</Label>
              <Textarea
                id="description"
                placeholder="해석에 필요한 추가 정보를 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="design-files">
                설계 파일 <span className="text-destructive">*</span>
              </Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  id="design-files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="design-files"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    클릭하여 파일을 선택하거나 드래그 앤 드롭
                  </p>
                  <p className="text-xs text-muted-foreground">
                    여러 파일을 선택할 수 있습니다
                  </p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium">선택된 파일 ({files.length}개)</p>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileIcon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>총 용량: {(totalFileSize / 1024 / 1024).toFixed(2)} MB</span>
                    {isLargeUpload && (
                      <span className="text-yellow-600">
                        대용량 파일 (10MB 이상)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {uploading ? '업로드 중...' : loading ? '등록 중...' : '요청 등록'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
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
