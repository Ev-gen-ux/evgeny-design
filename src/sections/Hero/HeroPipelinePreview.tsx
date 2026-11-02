import { useEffect, useRef, useState } from 'react';
import { Layers, PenTool, Rocket, Search } from 'lucide-react';
import styles from './HeroPipelinePreview.module.css';

const stages = [
  { label: 'Discovery', Icon: Search },
  { label: 'Structure', Icon: Layers },
  { label: 'Visual', Icon: PenTool },
  { label: 'Prototype', Icon: Rocket },
];

/** An illustrative loop, not a live task-progress indicator. */
export function HeroPipelinePreview() {
  const ref = useRef<HTMLOListElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <ol ref={ref} className={styles.pipeline} data-running={running} data-noasm="1" aria-label="Design pipeline: Discovery, Structure, Visual, Prototype">
      {stages.map(({ label, Icon }, index) => (
        <li key={label} className={styles.stage}>
          <span className={styles.node} aria-hidden="true"><Icon className={styles.icon} /></span>
          <span className={styles.label}>{label}</span>
          {index < stages.length - 1 && <span className={styles.connection} aria-hidden="true"><span className={styles.beam} /></span>}
        </li>
      ))}
    </ol>
  );
}
