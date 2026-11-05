import { useEffect, useState } from 'react';
import { useApp } from '../../state/AppContext';
import styles from './layout.module.css';

export function Toast() {
  const { state } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!state.toast) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 2800);
    return () => window.clearTimeout(id);
  }, [state.toast]);

  return (
    <div className={`${styles.toast} ${visible ? styles.toastShow : ''}`} role="status" aria-live="polite">
      {state.toast?.text}
    </div>
  );
}
