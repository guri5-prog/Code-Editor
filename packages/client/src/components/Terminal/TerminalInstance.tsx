import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

export interface TerminalInstanceHandle {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  getContent: () => string;
  focus: () => void;
  findNext: (query: string) => boolean;
  findPrevious: (query: string) => boolean;
}

interface TerminalInstanceProps {
  visible: boolean;
  fontSize?: number;
  onData?: (data: string) => void;
}

function getXtermTheme() {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string, fallback: string) => style.getPropertyValue(prop).trim() || fallback;

  return {
    background: get('--bg-primary', '#1e1e2e'),
    foreground: get('--text-primary', '#cdd6f4'),
    cursor: get('--accent', '#89b4fa'),
    cursorAccent: get('--bg-primary', '#1e1e2e'),
    selectionBackground: 'rgba(137, 180, 250, 0.3)',
    selectionForeground: get('--text-primary', '#cdd6f4'),
    black: '#45475a',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#cba6f7',
    cyan: '#94e2d5',
    white: '#cdd6f4',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#cba6f7',
    brightCyan: '#94e2d5',
    brightWhite: '#ffffff',
  };
}

export const TerminalInstance = forwardRef<TerminalInstanceHandle, TerminalInstanceProps>(
  function TerminalInstance({ visible, fontSize = 13, onData }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const searchRef = useRef<SearchAddon | null>(null);
    const onDataRef = useRef(onData);
    onDataRef.current = onData;

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const terminal = new Terminal({
        fontSize,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        theme: getXtermTheme(),
        scrollback: 1000,
        cursorBlink: true,
        convertEol: true,
        disableStdin: false,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(searchAddon);

      terminal.open(container);

      termRef.current = terminal;
      fitRef.current = fitAddon;
      searchRef.current = searchAddon;

      terminal.onData((data) => onDataRef.current?.(data));

      requestAnimationFrame(() => fitAddon.fit());

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => fitAddon.fit());
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        terminal.dispose();
        termRef.current = null;
        fitRef.current = null;
        searchRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (visible) {
        requestAnimationFrame(() => fitRef.current?.fit());
      }
    }, [visible]);

    useEffect(() => {
      const t = termRef.current;
      if (t) {
        t.options.fontSize = fontSize;
        fitRef.current?.fit();
      }
    }, [fontSize]);

    useEffect(() => {
      const t = termRef.current;
      if (t) {
        t.options.theme = getXtermTheme();
      }
    });

    useImperativeHandle(ref, () => ({
      write(data: string) {
        termRef.current?.write(data);
      },
      writeln(data: string) {
        termRef.current?.writeln(data);
      },
      clear() {
        termRef.current?.reset();
      },
      getContent() {
        const t = termRef.current;
        if (!t) return '';
        const buf = t.buffer.active;
        const lines: string[] = [];
        for (let i = 0; i < buf.length; i++) {
          const line = buf.getLine(i);
          if (line) lines.push(line.translateToString());
        }
        return lines.join('\n').trimEnd();
      },
      focus() {
        termRef.current?.focus();
      },
      findNext(query: string) {
        return searchRef.current?.findNext(query) ?? false;
      },
      findPrevious(query: string) {
        return searchRef.current?.findPrevious(query) ?? false;
      },
    }));

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: visible ? 'block' : 'none',
        }}
      />
    );
  },
);
