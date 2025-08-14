'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useApi, ApiResponse } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';

// 发送邮箱数据类型
interface SendEmail {
  id: string;
  companyName: string;
  referralCode: string;
  referralLink: string;
  emailAccount: string;
  smtpServer: string;
  port: number;
  sslTls: boolean;
  isEnabled: boolean;
  senderName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// API响应类型
interface SendEmailListResponse {
  data: SendEmail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function SendEmailManagement() {
  const { get, post, put, delete: del, loading } = useApi();
  const { toast } = useToast();

  const [data, setData] = useState<SendEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SendEmail | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<{
    companyName: string;
    referralCode: string;
    referralLink: string;
    emailAccount: string;
    password?: string; // 改为可选
    smtpServer: string;
    port: number;
    sslTls: boolean;
    senderName: string;
    description: string;
  }>({
    companyName: '',
    referralCode: '',
    referralLink: '',
    emailAccount: '',
    password: '',
    smtpServer: '',
    port: 465,
    sslTls: true,
    senderName: '',
    description: ''
  });

  // 加载数据
  const loadData = async (page: number = 1, search?: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (search) {
        params.append('search', search);
      }

      const response: ApiResponse<SendEmail[]> = await get(`/api/send-emails?${params}`);
      
      if (response.success && response.data) {
        setData(response.data);
        if (response.pagination) {
          setCurrentPage(response.pagination.page);
          setTotalPages(response.pagination.totalPages);
          setTotal(response.pagination.total);
        }
      } else {
        toast({
          title: "加载失败",
          description: response.error?.message || "获取发送邮箱列表失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast({
        title: "加载失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
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

  // 搜索效果
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        loadData(1, searchTerm);
      } else {
        loadData(1);
      }
    }, 500); // 防抖

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 切换启用状态
  const handleToggleEnabled = async (id: string, checked: boolean) => {
    setLoadingAction(`toggle-${id}`);
    try {
      const response: ApiResponse<SendEmail> = await put(`/api/send-emails/${id}`, {
        isEnabled: checked
      });

      if (response.success) {
        // 更新本地状态
        setData(prev => prev.map(item =>
          item.id === id ? { ...item, isEnabled: checked } : item
        ));
        toast({
          title: "更新成功",
          description: `发送邮箱已${checked ? '启用' : '禁用'}`,
        });
      } else {
        toast({
          title: "更新失败",
          description: response.error?.message || "状态更新失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Toggle enabled error:', error);
      toast({
        title: "更新失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 打开新增对话框
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      companyName: '',
      referralCode: '',
      referralLink: '',
      emailAccount: '',
      password: '',
      smtpServer: '',
      port: 465,
      sslTls: true,
      senderName: '',
      description: ''
    });
    setIsDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (item: SendEmail) => {
    setEditingItem(item);
    setFormData({
      companyName: item.companyName,
      referralCode: item.referralCode,
      referralLink: item.referralLink,
      emailAccount: item.emailAccount,
      password: '', // 编辑时不显示密码
      smtpServer: item.smtpServer,
      port: item.port,
      sslTls: item.sslTls,
      senderName: item.senderName,
      description: item.description || ''
    });
    setIsDialogOpen(true);
  };

  // 删除项目
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个发送邮箱吗？')) {
      return;
    }

    setLoadingAction(`delete-${id}`);
    try {
      const response: ApiResponse = await del(`/api/send-emails/${id}`);

      if (response.success) {
        // 重新加载数据
        await loadData(currentPage, searchTerm);
        toast({
          title: "删除成功",
          description: "发送邮箱已删除",
        });
      } else {
        toast({
          title: "删除失败",
          description: response.error?.message || "删除失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "删除失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 保存表单
  const handleSave = async () => {
    // 基础验证
    if (!formData.companyName || !formData.referralCode || !formData.referralLink || 
        !formData.emailAccount || !formData.smtpServer || !formData.senderName) {
      toast({
        title: "验证失败",
        description: "请填写所有必填字段",
        variant: "destructive",
      });
      return;
    }

    // 新增时密码必填
    if (!editingItem && !formData.password) {
      toast({
        title: "验证失败",
        description: "密码不能为空",
        variant: "destructive",
      });
      return;
    }

    try {
      let response: ApiResponse<SendEmail>;

      if (editingItem) {
        // 编辑模式 - 只发送有值的密码字段
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        response = await put(`/api/send-emails/${editingItem.id}`, updateData);
      } else {
        // 新增模式
        response = await post('/api/send-emails', formData);
      }

      if (response.success) {
        setIsDialogOpen(false);
        // 重新加载数据
        await loadData(currentPage, searchTerm);
        toast({
          title: editingItem ? "更新成功" : "创建成功",
          description: `发送邮箱已${editingItem ? '更新' : '创建'}`,
        });
      } else {
        toast({
          title: editingItem ? "更新失败" : "创建失败",
          description: response.error?.message || "操作失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: editingItem ? "更新失败" : "创建失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
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
        <h1 className="text-xl font-semibold">发送邮箱管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleAdd} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            新增发送邮箱
          </Button>
        </div>
      </div>

      {/* 搜索表单 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱账号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            disabled={loading}
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
              <TableHead>企业名称</TableHead>
              <TableHead>内推码</TableHead>
              <TableHead>内推连接</TableHead>
              <TableHead>发送邮箱账号</TableHead>
              <TableHead>SMTP服务器</TableHead>
              <TableHead>端口</TableHead>
              <TableHead>SSL/TLS</TableHead>
              <TableHead>启用状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">加载中...</p>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <p className="text-muted-foreground">暂无数据</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.companyName}</TableCell>
                  <TableCell>{item.referralCode}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    <a href={item.referralLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {item.referralLink}
                    </a>
                  </TableCell>
                  <TableCell>{item.emailAccount}</TableCell>
                  <TableCell>{item.smtpServer}</TableCell>
                  <TableCell>{item.port}</TableCell>
                  <TableCell>{item.sslTls ? '是' : '否'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isEnabled}
                      onCheckedChange={(checked) => handleToggleEnabled(item.id, checked)}
                      disabled={loadingAction === `toggle-${item.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(item)}
                        disabled={loadingAction !== null}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(item.id)}
                        disabled={loadingAction === `delete-${item.id}` || loadingAction !== null}
                      >
                        {loadingAction === `delete-${item.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页和统计信息 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {total} 条记录
          {searchTerm && ` (搜索结果)`}
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '编辑发送邮箱' : '新增发送邮箱'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">企业名称 *</label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="请输入企业名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium">内推码 *</label>
              <Input
                value={formData.referralCode}
                onChange={(e) => setFormData(prev => ({ ...prev, referralCode: e.target.value }))}
                placeholder="请输入内推码"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">内推连接 *</label>
              <Input
                value={formData.referralLink}
                onChange={(e) => setFormData(prev => ({ ...prev, referralLink: e.target.value }))}
                placeholder="请输入内推连接"
              />
            </div>
            <div>
              <label className="text-sm font-medium">邮箱账号 *</label>
              <Input
                type="email"
                value={formData.emailAccount}
                onChange={(e) => setFormData(prev => ({ ...prev, emailAccount: e.target.value }))}
                placeholder="请输入邮箱账号"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                登录密码/授权码 {!editingItem && '*'}
                {editingItem && <span className="text-xs text-muted-foreground">(留空则不修改)</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder={editingItem ? "留空则不修改密码" : "请输入密码或授权码"}
              />
            </div>
            <div>
              <label className="text-sm font-medium">SMTP服务器 *</label>
              <Input
                value={formData.smtpServer}
                onChange={(e) => setFormData(prev => ({ ...prev, smtpServer: e.target.value }))}
                placeholder="请输入SMTP服务器地址"
              />
            </div>
            <div>
              <label className="text-sm font-medium">端口号</label>
              <Select value={formData.port.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, port: parseInt(value) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="465">465</SelectItem>
                  <SelectItem value="587">587</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">SSL/TLS *</label>
              <Select value={formData.sslTls ? 'true' : 'false'} onValueChange={(value) => setFormData(prev => ({ ...prev, sslTls: value === 'true' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">发件人名称 *</label>
              <Input
                value={formData.senderName}
                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                placeholder="请输入发件人名称"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入描述信息"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 