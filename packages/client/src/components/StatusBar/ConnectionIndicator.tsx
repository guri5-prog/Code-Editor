import { useSaveStore } from '../../store/saveStore';
import styles from './StatusBar.module.css';

export function ConnectionIndicator() {
  const online = useSaveStore((s) => s.online);

  return (
    <span className={styles.item} aria-label={`Connection: ${online ? 'Online' : 'Offline'}`}>
      <span className={online ? styles.dotGreen : styles.dotRed} aria-hidden="true" />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
