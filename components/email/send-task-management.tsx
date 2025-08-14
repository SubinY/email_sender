'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

// MultiSelect Option 接口
interface Option {
  label: string;
  value: string;
}
import { EmailStatusMatrix } from './email-status-matrix';
import {
  Plus,
  Play,
  Pause,
  FileText,
  Calculator,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';

// 发送任务数据类型
interface SendTask {
  id: string;
  taskName: string;
  sendEmails: Array<{
    id: string;
    companyName: string;
    emailAccount: string;
    senderName: string;
  }>;
  startTime: string;
  endTime: string;
  durationDays: number;
  status: 'initialized' | 'running' | 'paused' | 'completed' | 'failed';
  emailsPerHour: number;
  emailsPerTeacherPerDay: number;
  createdAt: string;
  updatedAt: string;
}

// 任务计算结果
interface TaskCalculationResult {
  totalEmails: number;
  calculatedDays: number;
  dailySendLimit: number;
  dailyReceiveLimit: number;
  effectiveDailyRate: number;
  sendingSchedule: any[];
  statusMatrix: { [receiveId: string]: { [sendId: string]: string } };
}

// 任务状态数据
interface TaskStatusData {
  task: SendTask;
  sendEmails: Array<{
    id: string;
    companyName: string;
    emailAccount: string;
    senderName: string;
  }>;
  schedulerStatus: {
    isRunning: boolean;
    currentDay: number;
    startedAt?: string;
    completedAt?: string;
    statistics: {
      totalSent: number;
      totalFailed: number;
      totalPending: number;
      successRate: number;
      currentProgress: number;
    };
  } | null;
  statusMatrix: { [receiveId: string]: { [sendId: string]: string } };
  matrixStats: {
    pending: number;
    sent: number;
    failed: number;
    processing: number;
    total: number;
    successRate: number;
    completionRate: number;
  };
  realTimeStats: {
    isActive: boolean;
    progress: number;
    successRate: number;
    totalSent: number;
    totalFailed: number;
    totalPending: number;
  };
}

export function SendTaskManagement() {
  const [data, setData] = useState<SendTask[]>([]);
  const [sendEmailOptions, setSendEmailOptions] = useState<Option[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] =
    useState<TaskCalculationResult | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData | null>(
    null
  );
  const [isStatusMatrixOpen, setIsStatusMatrixOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    taskName: '',
    sendEmails: [] as Option[],
    emailsPerHour: 50,
    emailsPerTeacherPerDay: 2
  });

  const { toast } = useToast();
  const { get, post, put, delete: del } = useApi();

  // 组件初始化
  useEffect(() => {
    fetchData();
    fetchSendEmails();
  }, []);

  // 状态颜色映射
  const getStatusBadge = (status: SendTask['status']) => {
    switch (status) {
      case 'initialized':
        return <Badge variant="secondary">初始化</Badge>;
      case 'running':
        return <Badge className="bg-green-600">运行中</Badge>;
      case 'paused':
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-600"
          >
            已暂停
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-500 text-green-600">
            已完成
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-500 text-red-600">
            失败
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 获取任务列表数据
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await get('/api/send-tasks');

      if (response.success) {
        setData(response.data.tasks || []);
      } else {
        toast({
          variant: 'destructive',
          title: '获取数据失败',
          description: response.error?.message || '请重试'
        });
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast({
        variant: 'destructive',
        title: '获取数据失败',
        description: '网络错误，请重试'
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取发送邮箱选项
  const fetchSendEmails = async () => {
    try {
      const response = await get('/api/send-emails?page=1&limit=100');

      if (response.success) {
        const options =
          response.data?.map((email: any) => ({
            label: `${email.companyName} (${email.emailAccount})`,
            value: email.id
          })) || [];
        setSendEmailOptions(options);
      }
    } catch (error) {
      console.error('Failed to fetch send emails:', error);
    }
  };

  // 计算任务参数
  const calculateTask = async () => {
    if (formData.sendEmails.length === 0) {
      toast({
        variant: 'destructive',
        title: '参数错误',
        description: '请选择至少一个发送邮箱'
      });
      return;
    }

    try {
      setIsCalculating(true);
      const response = await post('/api/send-tasks/calculate', {
        sendEmailIds: formData.sendEmails.map((email) => email.value),
        emailsPerHour: formData.emailsPerHour,
        emailsPerTeacherPerDay: formData.emailsPerTeacherPerDay
      });

      if (response.success) {
        setCalculationResult(response.data.calculation);
        toast({
          title: '计算完成',
          description: `预计需要 ${response.data.calculation.calculatedDays} 天完成发送`
        });
      } else {
        toast({
          variant: 'destructive',
          title: '计算失败',
          description: response.error?.message || '请重试'
        });
      }
    } catch (error) {
      console.error('Failed to calculate task:', error);
      toast({
        variant: 'destructive',
        title: '计算失败',
        description: '网络错误，请重试'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // 任务控制（启动/暂停/恢复）
  const controlTask = async (
    taskId: string,
    action: 'start' | 'pause' | 'resume',
    calculation?: TaskCalculationResult
  ) => {
    try {
      const response = await post(`/api/send-tasks/${taskId}/control`, {
        action,
        calculationResult: calculation
      });

      if (response.success) {
        toast({
          title: '操作成功',
          description: response.data.message
        });
        fetchData(); // 刷新数据
      } else {
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: response.error?.message || '请重试'
        });
      }
    } catch (error) {
      console.error('Failed to control task:', error);
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '网络错误，请重试'
      });
    }
  };

  // 获取任务状态
  const fetchTaskStatus = async (taskId: string) => {
    try {
      const response = await get(`/api/send-tasks/${taskId}/status`);

      if (response.success) {
        setTaskStatusData(response.data);
      } else {
        toast({
          variant: 'destructive',
          title: '获取状态失败',
          description: response.error?.message || '请重试'
        });
      }
    } catch (error) {
      console.error('Failed to fetch task status:', error);
      toast({
        variant: 'destructive',
        title: '获取状态失败',
        description: '网络错误，请重试'
      });
    }
  };

  // 打开新增对话框
  const handleAdd = () => {
    setFormData({
      taskName: '',
      sendEmails: [], // 改为空数组，让用户自己选择
      emailsPerHour: 50,
      emailsPerTeacherPerDay: 2
    });
    setCalculationResult(null);
    setIsDialogOpen(true);
  };

  // 开始任务
  const handleStart = async (task: SendTask) => {
    if (!calculationResult) {
      toast({
        variant: 'destructive',
        title: '无法启动',
        description: '请先计算任务参数'
      });
      return;
    }
    await controlTask(task.id, 'start', calculationResult);
  };

  // 暂停任务
  const handlePause = async (task: SendTask) => {
    await controlTask(task.id, 'pause');
  };

  // 恢复任务
  const handleResume = async (task: SendTask) => {
    await controlTask(task.id, 'resume');
  };

  // 查看状态矩阵
  const handleViewMatrix = async (task: SendTask) => {
    setSelectedTask(task.id);
    await fetchTaskStatus(task.id);
    setIsStatusMatrixOpen(true);
  };

  // 处理 checkbox 选择
  const handleEmailSelection = (email: Option, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        // 添加选中的邮箱
        return {
          ...prev,
          sendEmails: [...prev.sendEmails, email]
        };
      } else {
        // 移除取消选中的邮箱
        return {
          ...prev,
          sendEmails: prev.sendEmails.filter((item) => item.value !== email.value)
        };
      }
    });
  };

  // 全选所有邮箱
  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      sendEmails: [...sendEmailOptions]
    }));
  };

  // 取消全选
  const handleUnselectAll = () => {
    setFormData((prev) => ({
      ...prev,
      sendEmails: []
    }));
  };

  // 保存表单
  const handleSave = async () => {
    if (!formData.taskName || formData.sendEmails.length === 0) {
      toast({
        variant: 'destructive',
        title: '表单验证失败',
        description: '请填写任务名称并选择发送邮箱'
      });
      return;
    }

    if (!calculationResult) {
      toast({
        variant: 'destructive',
        title: '请先计算',
        description: '请先计算任务参数后再保存'
      });
      return;
    }

    try {
      const response = await post('/api/send-tasks', {
        taskName: formData.taskName,
        sendEmailIds: formData.sendEmails.map((email) => email.value),
        emailsPerHour: formData.emailsPerHour,
        emailsPerTeacherPerDay: formData.emailsPerTeacherPerDay,
        durationDays: calculationResult.calculatedDays
      });

      if (response.success) {
        toast({
          title: '创建成功',
          description: '邮件发送任务已创建'
        });
        setIsDialogOpen(false);
        fetchData(); // 刷新列表
      } else {
        toast({
          variant: 'destructive',
          title: '创建失败',
          description: response.error?.message || '请重试'
        });
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        variant: 'destructive',
        title: '创建失败',
        description: '网络错误，请重试'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">发送任务管理</h1>
        </div>
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <div className="mt-2 text-sm text-gray-500">加载中...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <TableHead>预计天数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.taskName}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {item.sendEmails.map((email, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {email.companyName}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.startTime
                      ? new Date(item.startTime).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.durationDays ? `${item.durationDays}天` : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.status === 'initialized' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStart(item)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === 'running' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePause(item)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResume(item)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMatrix(item)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-gray-500"
                >
                  <div>
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <div>暂无数据</div>
                    <div className="text-sm mt-1">
                      点击"新增任务"创建您的第一个邮件发送任务
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 显示统计 */}
      <div className="text-sm text-muted-foreground">
        共 {data.length} 个任务
      </div>

      {/* 新增任务对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增发送任务</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium">任务名称 *</label>
                <Input
                  value={formData.taskName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taskName: e.target.value
                    }))
                  }
                  placeholder="请输入任务名称"
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">发送邮箱 *</label>
                  {sendEmailOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={handleSelectAll}
                        disabled={formData.sendEmails.length === sendEmailOptions.length}
                      >
                        全选
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={handleUnselectAll}
                        disabled={formData.sendEmails.length === 0}
                      >
                        全不选
                      </Button>
                    </div>
                  )}
                </div>
                <div className="border rounded-md p-3 space-y-3 max-h-48 overflow-y-auto">
                  {sendEmailOptions.length > 0 ? (
                    sendEmailOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={formData.sendEmails.some(
                            (email) => email.value === option.value
                          )}
                          onCheckedChange={(checked) =>
                            handleEmailSelection(option, !!checked)
                          }
                        />
                        <label
                          htmlFor={option.value}
                          className="text-sm font-normal leading-none cursor-pointer flex-1"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      暂无发送邮箱，请先添加发送邮箱
                    </div>
                  )}
                </div>
                {/* 显示已选择的数量 */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  {formData.sendEmails.length > 0 ? (
                    <span>已选择 {formData.sendEmails.length} 个邮箱</span>
                  ) : (
                    <span>请选择发送邮箱</span>
                  )}
                  {sendEmailOptions.length > 0 && (
                    <span>共 {sendEmailOptions.length} 个可用</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  每个邮箱每小时发送数量 *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={formData.emailsPerHour}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emailsPerHour: parseInt(e.target.value) || 0
                    }))
                  }
                  placeholder="请输入数量"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  每个老师每天收到不同企业邮件数量 *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.emailsPerTeacherPerDay}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emailsPerTeacherPerDay: parseInt(e.target.value) || 0
                    }))
                  }
                  placeholder="请输入数量"
                />
              </div>
            </div>

            {/* 计算按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={calculateTask}
                disabled={isCalculating || formData.sendEmails.length === 0}
                className="px-8"
              >
                {isCalculating ? (
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                计算任务参数
              </Button>
            </div>

            {/* 计算结果展示 */}
            {calculationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    计算结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {calculationResult.totalEmails}
                      </div>
                      <div className="text-sm text-gray-600">总邮件数</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {calculationResult.calculatedDays}
                      </div>
                      <div className="text-sm text-gray-600">预计天数</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {calculationResult.effectiveDailyRate}
                      </div>
                      <div className="text-sm text-gray-600">每日发送量</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {formData.sendEmails.length}
                      </div>
                      <div className="text-sm text-gray-600">发送邮箱数</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">
                      <div>
                        • 发送方每日上限: {calculationResult.dailySendLimit} 封
                      </div>
                      <div>
                        • 接收方每日上限: {calculationResult.dailyReceiveLimit}{' '}
                        封
                      </div>
                      <div>
                        • 有效发送率由较小值决定:{' '}
                        {calculationResult.effectiveDailyRate} 封/天
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!calculationResult && (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <div>请填写表单参数并点击"计算任务参数"</div>
                  <div className="text-sm mt-1">
                    系统将根据您的设置计算最优发送方案
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!calculationResult}>
              保存任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 状态矩阵对话框 */}
      <Dialog open={isStatusMatrixOpen} onOpenChange={setIsStatusMatrixOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {taskStatusData?.task.taskName} - 发送状态矩阵
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto">
            {taskStatusData ? (
              <>
                {/* 实时统计 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {taskStatusData.realTimeStats.progress.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">完成进度</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-green-600">
                        {taskStatusData.realTimeStats.totalSent}
                      </div>
                      <div className="text-sm text-gray-600">已发送</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-red-600">
                        {taskStatusData.realTimeStats.totalFailed}
                      </div>
                      <div className="text-sm text-gray-600">失败</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-gray-600">
                        {taskStatusData.realTimeStats.totalPending}
                      </div>
                      <div className="text-sm text-gray-600">待发送</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-purple-600">
                        {taskStatusData.schedulerStatus?.currentDay || 0}
                      </div>
                      <div className="text-sm text-gray-600">预估天数</div>
                    </CardContent>
                  </Card>
                </div>

                {/* 状态矩阵 */}
                <EmailStatusMatrix
                  statusMatrix={taskStatusData.statusMatrix}
                  sendEmails={taskStatusData.sendEmails}
                  matrixStats={taskStatusData.matrixStats}
                />
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusMatrixOpen(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
