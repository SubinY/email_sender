'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye, EyeOff } from 'lucide-react';

interface EmailStatusMatrixProps {
  statusMatrix: { [receiveId: string]: { [sendId: string]: string } };
  sendEmails: Array<{
    id: string;
    companyName: string;
    emailAccount: string;
    senderName: string;
  }>;
  matrixStats: {
    pending: number;
    sent: number;
    failed: number;
    processing: number;
    total: number;
    successRate: number;
    completionRate: number;
  };
  className?: string;
}

type StatusType = 'pending' | 'sent' | 'failed' | 'processing';

/**
 * 邮件发送状态矩阵组件
 * 
 * 功能特性：
 * - 二维表格显示发送状态
 * - 颜色编码状态（绿色=已发送，红色=失败，灰色=待发送）
 * - 搜索和过滤功能
 * - 统计信息展示
 * - 支持大数据量虚拟滚动
 */
export function EmailStatusMatrix({ 
  statusMatrix, 
  sendEmails, 
  matrixStats, 
  className = '' 
}: EmailStatusMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all');
  const [isCompactView, setIsCompactView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'failed':
        return '✗';
      case 'processing':
        return '●';
      case 'pending':
      default:
        return '○';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return '已发送';
      case 'failed':
        return '失败';
      case 'processing':
        return '发送中';
      case 'pending':
      default:
        return '待发送';
    }
  };

  // 过滤接收邮箱ID
  const receiveEmailIds = Object.keys(statusMatrix);
  const filteredReceiveIds = receiveEmailIds.filter(receiveId => {
    const matchesSearch = searchTerm === '' || receiveId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || Object.values(statusMatrix[receiveId]).some(status => status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // 分页
  const totalPages = Math.ceil(filteredReceiveIds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceiveIds = filteredReceiveIds.slice(startIndex, startIndex + itemsPerPage);

  // 导出数据
  const exportMatrix = () => {
    const csvContent = [
      ['接收邮箱', ...sendEmails.map(email => email.emailAccount)],
      ...receiveEmailIds.map(receiveId => [
        receiveId,
        ...sendEmails.map(sendEmail => getStatusText(statusMatrix[receiveId][sendEmail.id] || 'pending'))
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `email-status-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (receiveEmailIds.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-gray-500">
          <div className="text-lg mb-2">暂无数据</div>
          <div className="text-sm">任务尚未开始执行，状态矩阵将在任务启动后显示</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 统计信息 */}
      {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{matrixStats.sent}</div>
            <div className="text-sm text-gray-600">已发送</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{matrixStats.failed}</div>
            <div className="text-sm text-gray-600">失败</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{matrixStats.processing}</div>
            <div className="text-sm text-gray-600">发送中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{matrixStats.pending}</div>
            <div className="text-sm text-gray-600">待发送</div>
          </CardContent>
        </Card>
      </div> */}

      {/* 工具栏 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>邮件发送状态矩阵</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索接收邮箱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">所有状态</option>
                <option value="pending">待发送</option>
                <option value="processing">发送中</option>
                <option value="sent">已发送</option>
                <option value="failed">失败</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompactView(!isCompactView)}
              >
                {isCompactView ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportMatrix}
              >
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* 表格容器 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-96">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50">
                      接收邮箱
                    </th>
                    {sendEmails.map((sendEmail) => (
                      <th
                        key={sendEmail.id}
                        className="border border-gray-200 px-2 py-2 text-center text-xs font-medium text-gray-700 bg-gray-50 min-w-20"
                        title={`${sendEmail.companyName} (${sendEmail.emailAccount})`}
                      >
                        {isCompactView ? sendEmail.companyName.slice(0, 8) + '...' : sendEmail.companyName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedReceiveIds.map((receiveId) => (
                    <tr key={receiveId} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 bg-white sticky left-0">
                        {receiveId}
                      </td>
                      {sendEmails.map((sendEmail) => {
                        const status = statusMatrix[receiveId][sendEmail.id] || 'pending';
                        return (
                          <td key={`${receiveId}-${sendEmail.id}`} className="border border-gray-200 px-2 py-2 text-center">
                            <div
                              className={`inline-flex items-center justify-center w-8 h-8 rounded border text-xs font-medium ${getStatusStyle(status)}`}
                              title={`${getStatusText(status)} - ${sendEmail.emailAccount} -> ${receiveId}`}
                            >
                              {isCompactView ? getStatusIcon(status) : getStatusText(status).slice(0, 2)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-gray-600">
                显示 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredReceiveIds.length)} 条，
                共 {filteredReceiveIds.length} 条
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <span className="text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 图例 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">状态图例:</span>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${getStatusStyle('sent')}`}></div>
              <span>已发送</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${getStatusStyle('failed')}`}></div>
              <span>失败</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${getStatusStyle('processing')}`}></div>
              <span>发送中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border ${getStatusStyle('pending')}`}></div>
              <span>待发送</span>
            </div>
            <div className="ml-auto text-gray-600">
              成功率: {matrixStats.successRate?.toFixed(1)}% | 完成率: {matrixStats.completionRate?.toFixed(1)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 