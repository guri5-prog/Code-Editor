import { forwardRef, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { TerminalInstance, type TerminalInstanceHandle } from './TerminalInstance';
import { ReplConnection } from '../../services/replService';

interface ReplModeProps {
  language: string;
  visible: boolean;
  fontSize?: number;
}

const PROMPTS: Record<string, string> = {
  python: '>>> ',
  javascript: '> ',
};

export const ReplMode = forwardRef<TerminalInstanceHandle, ReplModeProps>(function ReplMode(
  { language, visible, fontSize },
  ref,
) {
  const termRef = useRef<TerminalInstanceHandle>(null);
  const connRef = useRef<ReplConnection | null>(null);
  const lineBufferRef = useRef('');
  const waitingRef = useRef(false);
  const prompt = PROMPTS[language] ?? '> ';

  const writePrompt = useCallback(() => {
    termRef.current?.write(`\r\n\x1b[32m${prompt}\x1b[0m`);
  }, [prompt]);

  useImperativeHandle(ref, () => ({
    write(data: string) {
      termRef.current?.write(data);
    },
    writeln(data: string) {
      termRef.current?.writeln(data);
    },
    clear() {
      termRef.current?.clear();
    },
    getContent() {
      return termRef.current?.getContent() ?? '';
    },
    focus() {
      termRef.current?.focus();
    },
    findNext(query: string) {
      return termRef.current?.findNext(query) ?? false;
    },
    findPrevious(query: string) {
      return termRef.current?.findPrevious(query) ?? false;
    },
  }));

  const handleData = useCallback(
    (data: string) => {
      if (waitingRef.current) return;

      if (data === '\r' || data === '\n') {
        const line = lineBufferRef.current.trim();
        lineBufferRef.current = '';

        if (!line) {
          writePrompt();
          return;
        }

        termRef.current?.write('\r\n');
        waitingRef.current = true;

        if (connRef.current?.connected) {
          if (line === '/reset') {
            termRef.current?.write('\x1b[2mResetting session...\x1b[0m');
            connRef.current.reset();
          } else {
            connRef.current.eval(line);
          }
        } else {
          termRef.current?.write('\x1b[31mNot connected\x1b[0m');
          waitingRef.current = false;
          writePrompt();
        }
        return;
      }

      if (data === '\x7f' || data === '\b') {
        if (lineBufferRef.current.length > 0) {
          lineBufferRef.current = lineBufferRef.current.slice(0, -1);
          termRef.current?.write('\b \b');
        }
        return;
      }

      if (data === '\x03') {
        lineBufferRef.current = '';
        termRef.current?.write('^C');
        writePrompt();
        return;
      }

      if (data.charCodeAt(0) < 32 && data !== '\t') return;

      lineBufferRef.current += data;
      termRef.current?.write(data);
    },
    [writePrompt],
  );

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    term.writeln(`\x1b[1;36m${language.charAt(0).toUpperCase() + language.slice(1)} REPL\x1b[0m`);
    term.writeln('\x1b[2mType expressions and press Enter. Use /reset to clear state.\x1b[0m');
    term.write('\x1b[2mConnecting...\x1b[0m');

    const conn = new ReplConnection(language, {
      onReady: () => {
        term.write('\r\x1b[K\x1b[32mConnected\x1b[0m');
        waitingRef.current = false;
        writePrompt();
      },
      onResult: (stdout, stderr) => {
        if (stdout) term.write(stdout.replace(/\n/g, '\r\n'));
        if (stderr) term.write(`\x1b[31m${stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
        waitingRef.current = false;
        writePrompt();
      },
      onError: (message) => {
        term.write(`\r\n\x1b[31mError: ${message}\x1b[0m`);
        waitingRef.current = false;
        writePrompt();
      },
      onClose: () => {
        term.write('\r\n\x1b[2mDisconnected\x1b[0m');
        waitingRef.current = false;
      },
    });

    connRef.current = conn;

    return () => {
      conn.close();
      connRef.current = null;
    };
  }, [language, writePrompt]);

  return (
    <TerminalInstance ref={termRef} visible={visible} fontSize={fontSize} onData={handleData} />
  );
});
