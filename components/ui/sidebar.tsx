'use client';

import * as React from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarItemKey = string;

export type SidebarItem<T extends string> = {
  key: T;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

interface SidebarProps<T extends string> {
  items: Array<SidebarItem<T>>;
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
  brand?: React.ReactNode;
  footer?: React.ReactNode;
  onLogout?: () => void;
}

export function Sidebar<T extends string>({
  items,
  activeKey,
  onChange,
  className,
  brand,
  footer,
  onLogout
}: SidebarProps<T>) {
  const navRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const [y, setY] = React.useState(0);
  const [h, setH] = React.useState(48);

  const recalc = React.useCallback(() => {
    const nav = navRef.current;
    const el = itemRefs.current[activeKey as string];
    if (!nav || !el) return;
    const n = nav.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const height = Math.max(40, Math.min(52, b.height)); // 更贴近设计的胶囊高度
    const top = b.top - n.top + (b.height - height) / 2;
    setH(height);
    setY(top);
  }, [activeKey]);

  React.useLayoutEffect(() => {
    recalc();
  }, [recalc, items.length]);

  React.useEffect(() => {
    const onRz = () => recalc();
    window.addEventListener('resize', onRz);
    const id = setTimeout(recalc, 0);
    return () => {
      window.removeEventListener('resize', onRz);
      clearTimeout(id);
    };
  }, [recalc]);

  return (
    <aside
      className={cn(
        'fixed left-0 z-30 flex h-full w-60 flex-col bg-sky-900 p-4 text-white',
        'rounded-r-3xl shadow-lg relative',
        className
      )}
    >
      <div className="mb-6 px-2">
        {brand ?? (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-sky-900 font-bold">Em</div>
            <div className="text-lg font-semibold tracking-wide">管理后台</div>
          </div>
        )}
      </div>

      <nav ref={navRef} className="relative flex-1 space-y-3">
        {/* 悬浮选中块（独立移动图层） */}
        <SelectionOverlay y={y} h={h} />

        {items.map(({ key, label, icon: Icon }) => {
          const isActive = key === activeKey;
          return (
            <button
              key={key}
              ref={(el) => {
                itemRefs.current[key] = el || null; // 不返回值，避免 ref 类型报错
              }}
              onClick={() => onChange(key)}
              className={cn(
                'relative z-10 flex h-12 w-full items-center gap-3 rounded-full px-3 text-left outline-none',
                // 透明按钮：视觉由 SelectionOverlay 承担
                isActive ? 'text-sky-900' : 'text-white/90 hover:text-white'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                  isActive
                    ? 'border-sky-200 bg-sky-50 text-sky-900'
                    : 'border-white/30 bg-white/10 text-white'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[15px]">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        {footer ?? (
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            type="button"
            onClick={() => {}}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="text-[15px]" onClick={onLogout}>退出登录</span>
          </button>
        )}
      </div>
    </aside>
  );
}

function SelectionOverlay({ y, h }: { y: number; h: number }) {
  return (
    <div
      className="pointer-events-none absolute left-2 -right-10 z-0 will-change-transform transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: `translateY(${Math.max(0, y)}px)`, height: h }}
    >
      {/* 单一胶囊，向右外延（-right-10），与右侧白色背景连成一体 */}
      <div className="absolute inset-0 rounded-full bg-white" />
    </div>
  );
}