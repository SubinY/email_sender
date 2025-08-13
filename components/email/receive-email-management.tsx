'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Upload, Plus, Edit, Trash2 } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog';

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
  const { toast } = useToast();
  const [data, setData] = useState<ReceiveEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceiveEmail | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item: ReceiveEmail | null;
  }>({ open: false, item: null });
  
  const [bulkImportDialog, setBulkImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  
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
    } else {
      toast({
        title: '加载失败',
        description: response.error?.message || '无法加载数据',
        variant: 'destructive'
      });
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
      toast({
        title: '更新成功',
        description: `已${checked ? '加入' : '移出'}黑名单`,
        variant: 'success'
      });
    } else {
      toast({
        title: '更新失败',
        description: response.error?.message || '无法更新黑名单状态',
        variant: 'destructive'
      });
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

  // 打开删除确认对话框
  const handleDeleteClick = (item: ReceiveEmail) => {
    setDeleteDialog({ open: true, item });
  };

  // 执行删除
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.item) return;

    const response = await del(`/api/receive-emails/${deleteDialog.item.id}`);
    
    if (response.success) {
      setDeleteDialog({ open: false, item: null });
      loadData(pagination.page);
      toast({
        title: '删除成功',
        description: `接收邮箱 ${deleteDialog.item.email} 已删除`,
        variant: 'success'
      });
    } else {
      toast({
        title: '删除失败',
        description: response.error?.message || '无法删除接收邮箱',
        variant: 'destructive'
      });
    }
  };

  // 保存表单
  const handleSave = async () => {
    if (!formData.universityName || !formData.email) {
      toast({
        title: '表单验证失败',
        description: '请填写学校名称和邮箱',
        variant: 'warning'
      });
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
      toast({
        title: editingItem ? '更新成功' : '创建成功',
        description: `接收邮箱 ${formData.email} ${editingItem ? '已更新' : '已创建'}`,
        variant: 'success'
      });
    } else {
      const errorMessage = response.error?.message || '操作失败';
      toast({
        title: editingItem ? '更新失败' : '创建失败',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    loadData(page, searchTerm);
  };

  // 批量导入处理
  const handleBulkImport = () => {
    setBulkImportDialog(true);
  };

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      const isValidType = allowedTypes.includes(file.type) || file.name.match(/\.(xlsx|xls)$/);
      
      if (!isValidType) {
        toast({
          title: '文件格式错误',
          description: '请选择Excel文件(.xlsx 或 .xls)',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  // 执行批量导入
  const handleImportConfirm = async () => {
    if (!selectedFile) {
      toast({
        title: '请选择文件',
        description: '请先选择要导入的Excel文件',
        variant: 'warning'
      });
      return;
    }



    setImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await post('/api/receive-emails/bulk-import', formData, { isFormData: true });

      if (response.success) {
        toast({
          title: '导入成功',
          description: `成功导入 ${response.data?.importCount || 0} 条记录`,
          variant: 'success'
        });
        setBulkImportDialog(false);
        setSelectedFile(null);
        loadData(1); // 刷新列表
      } else {
        // 处理各种错误类型
        if (response.error?.code === 'VALIDATION_ERROR') {
          toast({
            title: '数据验证失败',
            description: response.error?.details?.message || '部分数据格式不正确，请检查后重新上传',
            variant: 'destructive'
          });
        } else if (response.error?.code === 'DUPLICATE_EMAILS') {
          toast({
            title: '存在重复邮箱',
            description: response.error?.details?.message || '部分邮箱地址已存在',
            variant: 'destructive'
          });
        } else {
          toast({
            title: '导入失败',
            description: response.error?.message || '导入过程中发生错误',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: '导入失败',
        description: '网络错误或服务器异常',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  // 下载模板文件
  const handleDownloadTemplate = () => {
    // 创建模板数据
    const templateData = [
      ['学校', '学院', '联系人', '邮箱', '电话', '备注'],
      ['北京大学', '数学科学学院', '张三', 'zhangsan@pku.edu.cn', '13800138000', '数学系主任'],
      ['清华大学', '计算机科学与技术系', '李四', 'lisi@tsinghua.edu.cn', '13800138001', '计算机系教授']
    ];

    // 创建CSV格式的内容
    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', '批量导入模板.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-4">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">接收邮箱管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleBulkImport}>
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
            placeholder="搜索学校名称..."
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
              <TableHead>学校名称</TableHead>
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteClick(item)}
                      >
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
              <label className="text-sm font-medium">学校名称 *</label>
              <Input
                value={formData.universityName}
                onChange={(e) => setFormData(prev => ({ ...prev, universityName: e.target.value }))}
                placeholder="请输入学校名称"
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

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        onConfirm={handleDeleteConfirm}
        loading={loading}
        itemName={deleteDialog.item?.universityName || ''}
        description="此操作将永久删除该接收邮箱记录。"
      />

      {/* 批量导入对话框 */}
      <Dialog open={bulkImportDialog} onOpenChange={setBulkImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>批量导入接收邮箱</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>请上传Excel文件(.xlsx或.xls格式)，文件必须包含以下列：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>学校 (必填)</li>
                <li>学院</li>
                <li>联系人</li>
                <li>邮箱 (必填)</li>
                <li>电话</li>
                <li>备注</li>
              </ul>
            </div>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-file-input"
              />
              <label 
                htmlFor="excel-file-input" 
                className="cursor-pointer block"
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-sm">
                  <span className="font-medium text-primary hover:underline">
                    点击选择文件
                  </span>
                  <span className="text-muted-foreground"> 或拖拽文件到此处</span>
                </div>
              </label>
              
              {selectedFile && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(selectedFile.size / 1024)} KB
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate}
                className="text-primary"
              >
                下载导入模板
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setBulkImportDialog(false);
                setSelectedFile(null);
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleImportConfirm} 
              disabled={!selectedFile || importing}
            >
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 