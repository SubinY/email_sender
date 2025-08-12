'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Search, Upload } from 'lucide-react';

// 接收邮箱数据类型
interface ReceiveEmail {
  id: number;
  universityName: string;
  collegeName: string;
  contactPerson: string;
  province: string;
  email: string;
  phone: string;
  responsibility: string;
  isBlacklisted: boolean;
}

// 模拟数据
const mockData: ReceiveEmail[] = [
  {
    id: 1,
    universityName: '北京大学',
    collegeName: '计算机学院',
    contactPerson: '张教授',
    province: '北京',
    email: 'zhang@pku.edu.cn',
    phone: '010-12345678',
    responsibility: '学术合作',
    isBlacklisted: false
  },
  {
    id: 2,
    universityName: '清华大学',
    collegeName: '软件学院',
    contactPerson: '李教授',
    province: '北京',
    email: 'li@tsinghua.edu.cn',
    phone: '010-87654321',
    responsibility: '人才培养',
    isBlacklisted: true
  },
  {
    id: 3,
    universityName: '复旦大学',
    collegeName: '信息学院',
    contactPerson: '王教授',
    province: '上海',
    email: 'wang@fudan.edu.cn',
    phone: '021-12345678',
    responsibility: '技术交流',
    isBlacklisted: false
  }
];

export function ReceiveEmailManagement() {
  const [data, setData] = useState<ReceiveEmail[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');

  // 筛选数据
  const filteredData = data.filter(item =>
    item.universityName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 切换黑名单状态
  const handleBlacklistToggle = (id: number, checked: boolean) => {
    setData(prev => prev.map(item =>
      item.id === id ? { ...item, isBlacklisted: checked } : item
    ));
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
          />
        </div>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
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
    </div>
  );
} 