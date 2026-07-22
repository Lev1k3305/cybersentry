import React, { useState, useEffect, useRef } from 'react';
import { useExecuteCommand } from '@workspace/api-client-react';

type LogEntry = {
  id: string;
  type: 'boot' | 'input' | 'info' | 'success' | 'error' | 'system' | 'clear';
  text: string;
  timestamp?: string;
  command?: string;
};

const BOOT_SEQ = [
  "ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...",
  "ЗАГРУЗКА ЯДРА...",
  "МОДУЛИ ПОДКЛЮЧЕНЫ.",
  "УСТАНОВКА ЗАЩИЩЕННОГО КАНАЛА...",
  "СОЕДИНЕНИЕ УСТАНОВЛЕНО."
];

// ⚡ Bolt Optimization: Memoize TerminalRow rendering.
// Since terminal log entries are immutable once created, but typing in the input field triggers state
// updates on every keystroke, wrapping each individual log line in React.memo and comparing the entry ID
// completely prevents unnecessary re-renders of existing historical console items. This drastically
// cuts down layout and render times of terminal lines during high-frequency text input.
const TerminalRow = React.memo(function TerminalRow({ log }: { log: LogEntry }) {
  let colorClass = 'text-primary glow-text';
  if (log.type === 'error') colorClass = 'text-destructive glow-text-destructive';
  if (log.type === 'system' || log.type === 'boot') colorClass = 'text-accent glow-text-accent';
  if (log.type === 'success') colorClass = 'text-primary glow-text';

  const renderLogText = () => {
    if (log.type === 'input') {
      return (
        <div className="flex gap-2">
          <span className="text-accent shrink-0 glow-text-accent">{'>'}</span>
          <span className="text-primary glow-text">{log.text}</span>
        </div>
      );
    }

    return (
      <div className={`whitespace-pre-wrap ${colorClass}`}>
        {log.text}
      </div>
    );
  };

  return (
    <div className="flex gap-3 text-sm font-mono leading-relaxed group hover:bg-white/5 p-1 -mx-1 rounded transition-colors">
      <span className="text-muted-foreground shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity">
        [{log.timestamp}]
      </span>
      <div className="flex-1 break-words">
        {renderLogText()}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.log.id === nextProps.log.id && prevProps.log.timestamp === nextProps.log.timestamp;
});

export function Terminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const execCommand = useExecuteCommand();

  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let delay = 0;
    const timeouts: NodeJS.Timeout[] = [];
    const seed = Date.now();

    BOOT_SEQ.forEach((msg, i) => {
      delay += 300 + Math.random() * 500;
      const t = setTimeout(() => {
        setLogs(prev => [...prev, {
          id: `boot-${seed}-${i}`,
          type: 'boot',
          text: msg,
          timestamp: new Date().toLocaleTimeString('ru-RU')
        }]);
      }, delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    setInput('');
    setHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);

    const ts = new Date().toLocaleTimeString('ru-RU');

    setLogs(prev => [...prev, {
      id: `in-${Date.now()}`,
      type: 'input',
      text: cmd,
      timestamp: ts,
    }]);

    execCommand.mutate({ data: { command: cmd } }, {
      onSuccess: (res) => {
        if (res.type === 'clear') {
          setLogs([]);
          return;
        }
        setLogs(prev => [...prev, {
          id: `out-${Date.now()}`,
          type: res.type as LogEntry['type'],
          text: res.output,
          timestamp: res.timestamp || new Date().toLocaleTimeString('ru-RU')
        }]);
      },
      onError: (error: unknown) => {
        // 400 responses return a structured CommandResult body — surface it directly
        const apiData = (error as { data?: { output?: string } } | null)?.data;
        const text = apiData?.output ?? 'СИСТЕМНАЯ ОШИБКА: НЕТ СВЯЗИ С ЦЕНТРОМ';
        setLogs(prev => [...prev, {
          id: `err-${Date.now()}`,
          type: 'error',
          text,
          timestamp: new Date().toLocaleTimeString('ru-RU')
        }]);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx;
        setHistoryIdx(nextIdx);
        setInput(history[history.length - 1 - nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(history[history.length - 1 - nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative" onClick={() => inputRef.current?.focus()}>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {logs.map(log => (
          <TerminalRow key={log.id} log={log} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-background/95 backdrop-blur border-t border-border p-4 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 items-center">
          <span className="text-accent glow-text-accent whitespace-nowrap">ОПЕРАТОР_01 $</span>
          <div className="flex-1 relative flex items-center h-8">
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full h-full bg-transparent border-none outline-none text-transparent caret-transparent relative z-10"
              autoComplete="off"
              spellCheck="false"
            />
            {/* Custom blinking block cursor overlay */}
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-primary glow-text pointer-events-none z-0 whitespace-pre">
              {input}
              <span className="inline-block w-2.5 h-4 bg-primary animate-pulse align-middle ml-px"></span>
            </span>
            <div className="absolute bottom-0 left-0 w-full h-px bg-primary/30"></div>
          </div>
          <button 
            type="submit"
            className="shrink-0 bg-transparent text-primary border border-primary/50 px-4 py-1.5 uppercase text-sm tracking-wider hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 focus:outline-none focus:ring-1 focus:ring-primary shadow-[0_0_10px_rgba(0,255,65,0.2)] hover:shadow-[0_0_15px_rgba(0,255,65,0.5)]"
          >
            ИСПОЛНИТЬ
          </button>
        </form>
      </div>
    </div>
  );
}
