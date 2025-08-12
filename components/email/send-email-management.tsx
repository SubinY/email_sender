'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

// 发送邮箱数据类型
interface SendEmail {
  id: number;
  companyName: string;
  referralCode: string;
  referralLink: string;
  emailAccount: string;
  smtpServer: string;
  port: number;
  sslTls: boolean;
  isEnabled: boolean;
  senderName: string;
  description: string;
}

// 模拟数据
const mockData: SendEmail[] = [
  {
    id: 1,
    companyName: '腾讯科技',
    referralCode: 'TX2024',
    referralLink: 'https://tencent.com/jobs',
    emailAccount: 'hr@tencent.com',
    smtpServer: 'smtp.tencent.com',
    port: 465,
    sslTls: true,
    isEnabled: true,
    senderName: '腾讯招聘团队',
    description: '腾讯招聘邮件模板'
  },
  {
    id: 2,
    companyName: '阿里巴巴',
    referralCode: 'ALI2024',
    referralLink: 'https://alibaba.com/careers',
    emailAccount: 'recruit@alibaba.com',
    smtpServer: 'smtp.alibaba.com',
    port: 587,
    sslTls: false,
    isEnabled: false,
    senderName: '阿里巴巴人力资源',
    description: '阿里巴巴内推招聘'
  }
];

export function SendEmailManagement() {
  const [data, setData] = useState<SendEmail[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SendEmail | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
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

  // 筛选数据
  const filteredData = data.filter(item =>
    item.emailAccount.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 切换启用状态
  const handleToggleEnabled = (id: number, checked: boolean) => {
    setData(prev => prev.map(item =>
      item.id === id ? { ...item, isEnabled: checked } : item
    ));
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
      password: '',
      smtpServer: item.smtpServer,
      port: item.port,
      sslTls: item.sslTls,
      senderName: item.senderName,
      description: item.description
    });
    setIsDialogOpen(true);
  };

  // 删除项目
  const handleDelete = (id: number) => {
    if (confirm('确定要删除这个发送邮箱吗？')) {
      setData(prev => prev.filter(item => item.id !== id));
    }
  };

  // 保存表单
  const handleSave = () => {
    if (!formData.companyName || !formData.referralCode || !formData.referralLink || 
        !formData.emailAccount || !formData.smtpServer || !formData.senderName) {
      alert('请填写所有必填字段');
      return;
    }

    if (editingItem) {
      // 编辑模式
      setData(prev => prev.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              companyName: formData.companyName,
              referralCode: formData.referralCode,
              referralLink: formData.referralLink,
              emailAccount: formData.emailAccount,
              smtpServer: formData.smtpServer,
              port: formData.port,
              sslTls: formData.sslTls,
              senderName: formData.senderName,
              description: formData.description
            }
          : item
      ));
    } else {
      // 新增模式
      const newItem: SendEmail = {
        id: Math.max(...data.map(d => d.id), 0) + 1,
        companyName: formData.companyName,
        referralCode: formData.referralCode,
        referralLink: formData.referralLink,
        emailAccount: formData.emailAccount,
        smtpServer: formData.smtpServer,
        port: formData.port,
        sslTls: formData.sslTls,
        isEnabled: true,
        senderName: formData.senderName,
        description: formData.description
      };
      setData(prev => [...prev, newItem]);
    }

    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">发送邮箱管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
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
          />
        </div>
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
            {filteredData.map((item) => (
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 显示筛选结果统计 */}
      <div className="text-sm text-muted-foreground">
        共 {filteredData.length} 条记录
        {searchTerm && ` (从 ${data.length} 条记录中筛选)`}
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
              <label className="text-sm font-medium">登录密码/授权码 *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="请输入密码或授权码"
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
            <Button onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 