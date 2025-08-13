'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Upload, Plus, Edit, Trash2 } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface ReceiveEmail {
  id: string;
  universityName: string;
  collegeName?: string;
  contactPerson?: string;
  province?: string;
  email: string;
  phone?: string;
  responsibility?: string;
  isBlacklisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ReceiveEmailManagementApi() {
  const { get, post, put, delete: del, loading } = useApi();
  const [data, setData] = useState<ReceiveEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceiveEmail | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [formData, setFormData] = useState({
    universityName: '',
    collegeName: '',
    contactPerson: '',
    province: '',
    email: '',
    phone: '',
    responsibility: '',
    isBlacklisted: false
  });

  // 加载数据
  const loadData = async (page: number = 1, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.limit.toString()
    });

    if (search) {
      params.append('search', search);
    }

    const response = await get<ReceiveEmail[]>(`/api/receive-emails?${params}`);
    
    if (response.success && response.data) {
      setData(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    }
  };

  // 初始加载
  useEffect(() => {
    loadData();
  }, []);

  // 搜索处理
  const handleSearch = () => {
    loadData(1, searchTerm);
  };

  // 切换黑名单状态
  const handleBlacklistToggle = async (id: string, checked: boolean) => {
    const response = await put(`/api/receive-emails/${id}`, { isBlacklisted: checked });
    
    if (response.success) {
      setData(prev => prev.map(item =>
        item.id === id ? { ...item, isBlacklisted: checked } : item
      ));
    }
  };

  // 打开新增对话框
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      universityName: '',
      collegeName: '',
      contactPerson: '',
      province: '',
      email: '',
      phone: '',
      responsibility: '',
      isBlacklisted: false
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (item: ReceiveEmail) => {
    setEditingItem(item);
    setFormData({
      universityName: item.universityName,
      collegeName: item.collegeName || '',
      contactPerson: item.contactPerson || '',
      province: item.province || '',
      email: item.email,
      phone: item.phone || '',
      responsibility: item.responsibility || '',
      isBlacklisted: item.isBlacklisted
    });
    setIsDialogOpen(true);
  };

  // 删除项目
  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个接收邮箱吗？')) {
      const response = await del(`/api/receive-emails/${id}`);
      
      if (response.success) {
        loadData(pagination.page);
      }
    }
  };

  // 保存表单
  const handleSave = async () => {
    if (!formData.universityName || !formData.email) {
      alert('请填写高校名称和邮箱');
      return;
    }

    let response;
    if (editingItem) {
      response = await put(`/api/receive-emails/${editingItem.id}`, formData);
    } else {
      response = await post('/api/receive-emails', formData);
    }

    if (response.success) {
      setIsDialogOpen(false);
      loadData(pagination.page);
    } else {
      alert(response.error?.message || '操作失败');
    }
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    loadData(page, searchTerm);
  };

  return (
    <div className="space-y-4">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">接收邮箱管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => alert('批量导入功能开发中')}>
            <Upload className="mr-2 h-4 w-4" />
            批量导入
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增
          </Button>
        </div>
      </div>

      {/* 搜索表单 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索高校名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          搜索
        </Button>
      </div>

      {/* 数据表格 */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>高校名称</TableHead>
              <TableHead>学院名称</TableHead>
              <TableHead>联系人</TableHead>
              <TableHead>所属省份</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>主要职责</TableHead>
              <TableHead>是否黑名单</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.universityName}</TableCell>
                  <TableCell>{item.collegeName}</TableCell>
                  <TableCell>{item.contactPerson}</TableCell>
                  <TableCell>{item.province}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.phone}</TableCell>
                  <TableCell>{item.responsibility}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isBlacklisted}
                      onCheckedChange={(checked) => handleBlacklistToggle(item.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              上一页
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '编辑接收邮箱' : '新增接收邮箱'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">高校名称 *</label>
              <Input
                value={formData.universityName}
                onChange={(e) => setFormData(prev => ({ ...prev, universityName: e.target.value }))}
                placeholder="请输入高校名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium">学院名称</label>
              <Input
                value={formData.collegeName}
                onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                placeholder="请输入学院名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium">联系人</label>
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="请输入联系人"
              />
            </div>
            <div>
              <label className="text-sm font-medium">所属省份</label>
              <Input
                value={formData.province}
                onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                placeholder="请输入所属省份"
              />
            </div>
            <div>
              <label className="text-sm font-medium">邮箱 *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="请输入邮箱地址"
              />
            </div>
            <div>
              <label className="text-sm font-medium">联系电话</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入联系电话"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">主要职责</label>
              <Input
                value={formData.responsibility}
                onChange={(e) => setFormData(prev => ({ ...prev, responsibility: e.target.value }))}
                placeholder="请输入主要职责"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <Switch
                  checked={formData.isBlacklisted}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isBlacklisted: checked }))}
                />
                <span className="text-sm font-medium">加入黑名单</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 