import React from 'react';
import {
  LayoutDashboard,
  Phone,
  Mail,
  Globe,
  Search,
  Activity,
  Terminal,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type NavTab = 'overview' | 'phone' | 'email' | 'domain' | 'investigations' | 'log' | 'command';

interface SidebarProps {
  activeTab: NavTab;
  onTabSelect: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ activeTab, onTabSelect, isMobileOpen, onMobileClose }: SidebarProps) {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard, badge: null },
    { id: 'phone' as NavTab, label: 'Phone Intelligence', icon: Phone, badge: null },
    { id: 'email' as NavTab, label: 'Email Breach Scanner', icon: Mail, badge: null },
    { id: 'domain' as NavTab, label: 'Domain Intelligence', icon: Globe, badge: null },
    { id: 'investigations' as NavTab, label: 'Investigations', icon: Search, badge: 'In Dev' },
    { id: 'log' as NavTab, label: 'Event Logs', icon: Activity, badge: 'Live' },
    { id: 'command' as NavTab, label: 'Command Center', icon: Terminal, badge: null },
  ];

  const handleSelect = (id: NavTab) => {
    onTabSelect(id);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-border text-sidebar-foreground">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <span className="font-mono font-bold text-xs tracking-widest text-foreground uppercase">
            SOC WORKSTATION
          </span>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto font-mono text-xs">
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          NAVIGATION
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all text-left group ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/30 font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 border ${
                    item.badge === 'Live'
                      ? 'border-safe/40 text-safe bg-safe/10'
                      : 'border-muted text-muted-foreground'
                  }`}
                >
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-card/40 font-mono text-[11px] text-muted-foreground space-y-2">
        <div className="flex items-center justify-between">
          <span>Security Context</span>
          <span className="text-safe font-semibold">OSINT ACTIVE</span>
        </div>
        <div className="text-[10px] opacity-70">
          CyberSentry OSINT Engine v3.2
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 h-[calc(100vh-3.5rem)] sticky top-14 shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
