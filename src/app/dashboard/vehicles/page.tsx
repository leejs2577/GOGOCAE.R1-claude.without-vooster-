'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { VehicleModel } from '@/lib/supabase/types';
import { Plus, Trash2, Car } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function VehiclesPage() {
  const { isManager } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setVehicles(data);
    } catch (error) {
      console.error('차종 로딩 실패:', error);
      toast({
        title: '오류',
        description: '차종 목록을 불러올 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVehicleName.trim()) {
      toast({
        title: '입력 오류',
        description: '차종명을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('vehicle_models')
        .insert({ name: newVehicleName.trim() });

      if (error) {
        if (error.code === '23505') {
          throw new Error('이미 존재하는 차종명입니다.');
        }
        throw error;
      }

      toast({
        title: '차종 추가 완료',
        description: `${newVehicleName} 차종이 추가되었습니다.`,
      });

      setNewVehicleName('');
      setDialogOpen(false);
      fetchVehicles();
    } catch (error: any) {
      toast({
        title: '차종 추가 실패',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (id: string, name: string) => {
    if (!confirm(`정말로 "${name}" 차종을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicle_models')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: '차종 삭제 완료',
        description: `${name} 차종이 삭제되었습니다.`,
      });

      fetchVehicles();
    } catch (error: any) {
      toast({
        title: '차종 삭제 실패',
        description: error.message,
        variant: 'destructive',
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">차종 관리</h1>
          <p className="text-muted-foreground mt-2">
            해석 요청에 사용할 차종을 관리합니다
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              차종 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddVehicle}>
              <DialogHeader>
                <DialogTitle>새 차종 추가</DialogTitle>
                <DialogDescription>
                  새로운 차종명을 입력하세요
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="vehicle-name">차종명</Label>
                <Input
                  id="vehicle-name"
                  placeholder="예: GV80"
                  value={newVehicleName}
                  onChange={(e) => setNewVehicleName(e.target.value)}
                  className="mt-2"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? '추가 중...' : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>등록된 차종 ({vehicles.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>등록된 차종이 없습니다.</p>
              <p className="text-sm mt-2">새 차종을 추가해보세요.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-semibold">{vehicle.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          등록일: {format(new Date(vehicle.created_at), 'PPP', { locale: ko })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVehicle(vehicle.id, vehicle.name)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
