'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, MailOpen, Send } from 'lucide-react';
import { Sidebar } from '@/components/ui/sidebar';
import { ReceiveEmailManagement } from '@/components/email/receive-email-management';
import { SendEmailManagement } from '@/components/email/send-email-management';
import { SendTaskManagement } from '@/components/email/send-task-management';

type TabKey = 'receive' | 'send' | 'task';

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: React.ComponentType<any> }> = [
  { key: 'receive', label: '接收邮箱管理', icon: Mail },
  { key: 'send', label: '发送邮箱管理', icon: MailOpen },
  { key: 'task', label: '发送任务管理', icon: Send }
];

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
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

  return (
    <div className="min-h-screen w-full">
      {/* 左侧固定导航栏 */}
      <Sidebar
        className="fixed"
        items={NAV_ITEMS}
        activeKey={active}
        onChange={switchTab}
      />

      {/* 右侧内容区 */}
      <main className="ml-60 p-4 md:p-6">
        {active === 'receive' && <ReceiveEmailManagement />}
        {active === 'send' && <SendEmailManagement />}
        {active === 'task' && <SendTaskManagement />}
      </main>
    </div>
  );
} 