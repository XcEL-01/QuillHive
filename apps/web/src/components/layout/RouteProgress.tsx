import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";

export function RouteProgress() {
  const [location] = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => timeouts.current.forEach(clearTimeout);

  useEffect(() => {
    clear();
    setVisible(true);
    setProgress(15);
    const t1 = setTimeout(() => setProgress(45), 80);
    const t2 = setTimeout(() => setProgress(72), 250);
    const t3 = setTimeout(() => setProgress(90), 500);
    const t4 = setTimeout(() => {
      setProgress(100);
      const t5 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      timeouts.current.push(t5);
    }, 750);
    timeouts.current = [t1, t2, t3, t4];
    return clear;
  }, [location]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-primary pointer-events-none"
      style={{
        width: `${progress}%`,
        transition: "width 200ms ease-out, opacity 300ms",
        opacity: visible ? 1 : 0,
      }}
    />
  );
}