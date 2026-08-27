interface QuillHiveLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  variant?: 'default' | 'light' | 'dark';
}

export function QuillHiveLogo({
  size = 32,
  showWordmark = true,
  className = '',
  variant = 'default',
}: QuillHiveLogoProps) {
  const color =
    variant === 'light' ? '#ffffff' :
    variant === 'dark'  ? '#1a1a1a' :
    'hsl(var(--primary))';

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
          fill={color}
          fillOpacity="0.15"
          stroke={color}
          strokeWidth="2"
        />
        <path
          d="M12 28L22 12M22 12L28 18M22 12L16 15"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="8" stroke={color} strokeWidth="2" fill="none" />
        <path d="M25 25L29 29" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {showWordmark && (
        <span
          className="font-bold tracking-tight"
          style={{
            fontSize: size * 0.55,
            color,
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '-0.02em',
          }}
        >
          Quill<span style={{ opacity: 0.7 }}>Hive</span>
        </span>
      )}
    </div>
  );
}
