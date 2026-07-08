import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedSelect } from '@/components/ui/AnimatedSelect';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {  Factory, Activity, CheckCircle2  } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/api/axios';

export default function WorkOrders() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ stageName: 'CUTTING', qtyIn: '', qtyOut: '', rejectedQty: '0' });

  const { data: workOrders = [], isLoading, error } = useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => (await api.get('/production/work-orders')).data,
    retry: 1
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ['production-dashboard'],
    queryFn: async () => (await api.get('/production/dashboard')).data,
    retry: 1
  });

  const stageMutation = useMutation({
    mutationFn: async (data: any) => api.post('/production/stages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setIsStageDialogOpen(false);
    }
  });

  const handleStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stageMutation.mutate({
      workOrderId: selectedWO.id,
      ...stageForm
    });
  };

  const STAGES = ['CUTTING', 'STITCHING', 'CHECKING', 'IRONING', 'PACKING'];

  const columns = [
    { key: 'woNumber', label: t('production.cols.woNumber', 'WORK ORDER NO') },
    { key: 'order', label: t('production.cols.linkedOrder', 'LINKED ORDER'), render: (row: any) => row.order?.orderNumber || '-' },
    { key: 'targetQty', label: t('production.cols.targetQty', 'TARGET QTY'), render: (row: any) => <span className="font-bold">{row.targetQty} {t('production.pcs', 'pcs')}</span> },
    { key: 'status', label: t('customers.cols.status', 'Status'), render: (row: any) => (
      <Badge variant={row.status === 'RUNNING' ? 'default' : 'secondary'}>{row.status}</Badge>
    )},
    { key: 'progress', label: t('production.cols.stageProgress', 'STAGE PROGRESS'), render: (row: any) => {
      const lastStage = row.stages && row.stages.length > 0 ? row.stages[row.stages.length - 1] : null;
      const currentIndex = lastStage ? STAGES.indexOf(lastStage.stageName) : -1;
      
      return (
        <div className="flex items-center gap-1">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            
            return (
              <div 
                key={stage} 
                title={`${stage} ${isCurrent ? `(${lastStage?.qtyOut} ${t('production.pcs', 'pcs')})` : ''}`}
                className={`h-2 flex-1 rounded-full min-w-[20px] transition-all
                  ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}
                  ${isCurrent ? 'ring-2 ring-green-200 ring-offset-1' : ''}
                `}
              />
            );
          })}
          <span className="text-xs text-slate-400 ml-2 whitespace-nowrap min-w-[80px]">
            {lastStage ? lastStage.stageName : t('production.notStarted', 'Not Started')}
          </span>
        </div>
      );
    }},
    { key: 'actions', label: t('customers.cols.actions', 'ACTIONS'), render: (row: any) => (
      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => { setSelectedWO(row); setIsStageDialogOpen(true); }}>
        {t('production.updateStage', 'Update Stage')}
      </Button>
    )}
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">{t('production.title', 'Production Tracker')}</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('production.kpi.total', 'Total Work Orders')}</p>
              <p className="text-2xl font-bold">{dashboardStats?.totalWorkOrders || 0}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl"><Factory className="h-6 w-6 text-indigo-600" /></div>
          </CardContent>
        </Card>
        <Card className="glass border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('production.kpi.running', 'Running / Active')}</p>
              <p className="text-2xl font-bold text-orange-600">{dashboardStats?.runningWorkOrders || 0}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl"><Activity className="h-6 w-6 text-orange-600" /></div>
          </CardContent>
        </Card>
        <Card className="glass border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{t('production.kpi.target', 'Target Qty (Active)')}</p>
              <p className="text-2xl font-bold text-green-600">{dashboardStats?.targetRunningQty?.toLocaleString('en-IN') || 0} <span className="text-sm font-normal text-slate-400">{t('production.pcs', 'pcs')}</span></p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl"><CheckCircle2 className="h-6 w-6 text-green-600" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-end pt-2">
        <h2 className="text-lg font-bold text-slate-700">{t('production.activeOrders', 'Active Work Orders')}</h2>
      </div>

      <DataTable 
        columns={columns} 
        data={workOrders} 
        isLoading={isLoading}
        error={error}
        searchKey="woNumber" 
      />

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('production.form.title', 'Update Production Stage -')} {selectedWO?.woNumber}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStageSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('production.form.stage', 'Stage')}</Label>
              <AnimatedSelect 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={stageForm.stageName}
                onChange={e => setStageForm({ ...stageForm, stageName: e.target.value })}
                required
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </AnimatedSelect>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('production.form.qtyIn', 'Quantity In')}</Label>
                <AnimatedInput type="number" required value={stageForm.qtyIn} onChange={e => setStageForm({ ...stageForm, qtyIn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('production.form.qtyOut', 'Quantity Out')}</Label>
                <AnimatedInput type="number" required value={stageForm.qtyOut} onChange={e => setStageForm({ ...stageForm, qtyOut: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('production.form.rejected', 'Rejected/Damage Quantity')}</Label>
              <AnimatedInput type="number" required value={stageForm.rejectedQty} onChange={e => setStageForm({ ...stageForm, rejectedQty: e.target.value })} />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsStageDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={stageMutation.isPending}>{t('production.form.save', 'Save Stage')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
