'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Plus, Play, Pause, FileText } from 'lucide-react';

// 发送任务数据类型
interface SendTask {
  id: number;
  taskName: string;
  sendEmails: string[];
  startTime: string;
  endTime: string;
  duration: string;
  status: 'initialized' | 'running' | 'completed';
  emailsPerHour: number;
  emailsPerTeacherPerDay: number;
  maxEmailsPerDay: number;
  maxBatchSize: number;
}

// 模拟数据
const mockData: SendTask[] = [
  {
    id: 1,
    taskName: '2024春季校招任务',
    sendEmails: ['hr@tencent.com', 'recruit@alibaba.com'],
    startTime: '2024-03-01 09:00:00',
    endTime: '2024-04-30 18:00:00',
    duration: '60天',
    status: 'running',
    emailsPerHour: 50,
    emailsPerTeacherPerDay: 2,
    maxEmailsPerDay: 500,
    maxBatchSize: 20
  },
  {
    id: 2,
    taskName: '暑期实习招聘',
    sendEmails: ['hr@tencent.com'],
    startTime: '2024-05-01 10:00:00',
    endTime: '2024-06-15 17:00:00',
    duration: '45天',
    status: 'initialized',
    emailsPerHour: 30,
    emailsPerTeacherPerDay: 1,
    maxEmailsPerDay: 300,
    maxBatchSize: 15
  }
];

// 可用的发送邮箱选项
const sendEmailOptions: Option[] = [
  { label: 'hr@tencent.com (腾讯)', value: 'hr@tencent.com' },
  { label: 'recruit@alibaba.com (阿里)', value: 'recruit@alibaba.com' },
  { label: 'jobs@bytedance.com (字节)', value: 'jobs@bytedance.com' },
  { label: 'hr@baidu.com (百度)', value: 'hr@baidu.com' }
];

export function SendTaskManagement() {
  const [data, setData] = useState<SendTask[]>(mockData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    sendEmails: [] as Option[],
    emailsPerHour: 50,
    emailsPerTeacherPerDay: 2,
    maxEmailsPerDay: 500,
    maxBatchSize: 20
  });

  // 状态颜色映射
  const getStatusBadge = (status: SendTask['status']) => {
    switch (status) {
      case 'initialized':
        return <Badge variant="secondary">初始化</Badge>;
      case 'running':
        return <Badge>运行中</Badge>;
      case 'completed':
        return <Badge variant="outline">已结束</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 打开新增对话框
  const handleAdd = () => {
    setFormData({
      taskName: '',
      sendEmails: [],
      emailsPerHour: 50,
      emailsPerTeacherPerDay: 2,
      maxEmailsPerDay: 500,
      maxBatchSize: 20
    });
    setIsDialogOpen(true);
  };

  // 开始任务
  const handleStart = (id: number) => {
    setData(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'running' as const } : item
    ));
  };

  // 暂停任务
  const handlePause = (id: number) => {
    setData(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'initialized' as const } : item
    ));
  };

  // 查看详情
  const handleDetail = (id: number) => {
    const task = data.find(item => item.id === id);
    if (task) {
      alert(`任务详情：\n任务名称：${task.taskName}\n状态：${task.status}\n发送邮箱：${task.sendEmails.join(', ')}`);
    }
  };

  // 保存表单
  const handleSave = () => {
    if (!formData.taskName || formData.sendEmails.length === 0) {
      alert('请填写任务名称并选择发送邮箱');
      return;
    }

    const newTask: SendTask = {
      id: Math.max(...data.map(d => d.id), 0) + 1,
      taskName: formData.taskName,
      sendEmails: formData.sendEmails.map(email => email.value),
      startTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      duration: '30天',
      status: 'initialized',
      emailsPerHour: formData.emailsPerHour,
      emailsPerTeacherPerDay: formData.emailsPerTeacherPerDay,
      maxEmailsPerDay: formData.maxEmailsPerDay,
      maxBatchSize: formData.maxBatchSize
    };

    setData(prev => [...prev, newTask]);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">发送任务管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增任务
          </Button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务名称</TableHead>
              <TableHead>发送邮箱</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>结束时间</TableHead>
              <TableHead>完整持续周期</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.taskName}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {item.sendEmails.map((email, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{item.startTime}</TableCell>
                <TableCell>{item.endTime}</TableCell>
                <TableCell>{item.duration}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.status === 'initialized' && (
                      <Button variant="outline" size="sm" onClick={() => handleStart(item.id)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {item.status === 'running' && (
                      <Button variant="outline" size="sm" onClick={() => handlePause(item.id)}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDetail(item.id)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 显示统计 */}
      <div className="text-sm text-muted-foreground">
        共 {data.length} 个任务
      </div>

      {/* 新增任务对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增发送任务</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">任务名称 *</label>
              <Input
                value={formData.taskName}
                onChange={(e) => setFormData(prev => ({ ...prev, taskName: e.target.value }))}
                placeholder="请输入任务名称"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">发送邮箱 *</label>
              <MultiSelect
                options={sendEmailOptions}
                selected={formData.sendEmails}
                onChange={(selected) => setFormData(prev => ({ ...prev, sendEmails: selected }))}
                placeholder="选择发送邮箱..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">每个邮箱每小时发送数量 *</label>
              <Input
                type="number"
                min="1"
                value={formData.emailsPerHour}
                onChange={(e) => setFormData(prev => ({ ...prev, emailsPerHour: parseInt(e.target.value) || 0 }))}
                placeholder="请输入数量"
              />
            </div>
            <div>
              <label className="text-sm font-medium">每个老师每天收到不同企业邮件数量 *</label>
              <Input
                type="number"
                min="1"
                value={formData.emailsPerTeacherPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, emailsPerTeacherPerDay: parseInt(e.target.value) || 0 }))}
                placeholder="请输入数量"
              />
            </div>
            <div>
              <label className="text-sm font-medium">每天发送不超过数量 *</label>
              <Input
                type="number"
                min="1"
                value={formData.maxEmailsPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, maxEmailsPerDay: parseInt(e.target.value) || 0 }))}
                placeholder="默认500"
              />
            </div>
            <div>
              <label className="text-sm font-medium">单次批量发送不超过数量 *</label>
              <Input
                type="number"
                min="1"
                value={formData.maxBatchSize}
                onChange={(e) => setFormData(prev => ({ ...prev, maxBatchSize: parseInt(e.target.value) || 0 }))}
                placeholder="默认20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 