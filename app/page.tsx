'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, MailOpen, Send } from 'lucide-react';
import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';
import { ReceiveEmailManagementApi } from '@/components/email/receive-email-management';
import { SendEmailManagement } from '@/components/email/send-email-management';
import { SendTaskManagement } from '@/components/email/send-task-management';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

type TabKey = 'receive' | 'send' | 'task';

const NAV_ITEMS: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<any>;
}> = [
  { key: 'receive', label: '接收邮箱管理', icon: Mail },
  { key: 'send', label: '发送邮箱管理', icon: MailOpen },
  { key: 'task', label: '发送任务管理', icon: Send }
];

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
  const { logout } = useAuth();
  const { toast } = useToast();
  const initialTab = (params.get('tab') as TabKey) || 'receive';
  const [active, setActive] = useState<TabKey>(initialTab);

  useEffect(() => {
    const current = (params.get('tab') as TabKey) || 'receive';
    setActive(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function switchTab(next: TabKey) {
    setActive(next);
    const p = new URLSearchParams(window.location.search);
    p.set('tab', next);
    router.replace(`/?${p.toString()}`);
  }

  const handleLogout = async () => {
    try {
      toast({
        title: '退出登录',
        description: '正在退出登录...',
        variant: 'default'
      });
      
      await logout();
      
      toast({
        title: '退出成功',
        description: '已成功退出登录',
        variant: 'default'
      });
      
      // 退出成功后可以执行其他操作，比如重定向到登录页
      // router.push('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
      toast({
        title: '退出失败',
        description: '退出登录时发生错误，请重试',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen w-full">
      {/* 左侧固定导航栏 */}
      <Sidebar
        className="fixed"
        items={NAV_ITEMS}
        activeKey={active}
        onChange={switchTab}
        onLogout={handleLogout}
      />

      {/* 右侧内容区 */}
      <main className="ml-60 p-4 md:p-6">
        {active === 'receive' && <ReceiveEmailManagementApi />}
        {active === 'send' && <SendEmailManagement />}
        {active === 'task' && <SendTaskManagement />}
      </main>
    </div>
  );
}
