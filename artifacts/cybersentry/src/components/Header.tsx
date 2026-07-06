import React from 'react';
import { Terminal, Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-1.5 rounded-md border border-primary/20">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-mono font-bold text-xl tracking-widest text-primary">
            [ CyberSentry v3.0 ]
          </h1>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
            SECURE_CONN_ESTABLISHED
          </div>
        </div>
      </div>
    </header>
  );
}
