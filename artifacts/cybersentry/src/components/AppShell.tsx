import React from 'react';
import { Header } from './Header';
import { Sidebar, NavTab } from './Sidebar';
import { DisclaimerGate } from './DisclaimerGate';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: NavTab;
  onTabSelect: (tab: NavTab) => void;
}

export function AppShell({ children, activeTab, onTabSelect }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <DisclaimerGate />

      <Header
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex w-full">
        <Sidebar
          activeTab={activeTab}
          onTabSelect={onTabSelect}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
