import { forwardRef } from 'react';
import { TerminalInstance, type TerminalInstanceHandle } from './TerminalInstance';

interface TerminalTabProps {
  visible: boolean;
  fontSize?: number;
  onData?: (data: string) => void;
}

export const TerminalTab = forwardRef<TerminalInstanceHandle, TerminalTabProps>(
  function TerminalTab({ visible, fontSize, onData }, ref) {
    return <TerminalInstance ref={ref} visible={visible} fontSize={fontSize} onData={onData} />;
  },
);
