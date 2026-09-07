interface SkilloLogoProps {
  size?: number;
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export function SkilloLogo({
  size = 40,
  animated = true,
  showText = false,
  className = '',
}: SkilloLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 skillo-logo-wrap ${className}`}>
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={animated ? 'skillo-logo-animated' : ''}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
            transition: 'filter 0.3s ease',
          }}
        >
          {/* Left Upper Wing */}
          <polygon
            points="76,40 186,40 186,200"
            fill="currentColor"
            style={{ transition: 'fill 0.2s ease, opacity 0.2s ease' }}
          />

          {/* Left Lower Wing */}
          <polygon
            points="186,200 186,360 76,360"
            fill="currentColor"
            style={{ transition: 'fill 0.2s ease, opacity 0.2s ease' }}
          />

          {/* Right Upper Wing */}
          <polygon
            points="214,40 324,40 214,200"
            fill="currentColor"
            style={{ transition: 'fill 0.2s ease, opacity 0.2s ease' }}
          />

          {/* Right Lower Wing */}
          <polygon
            points="214,200 324,360 214,360"
            fill="currentColor"
            style={{ transition: 'fill 0.2s ease, opacity 0.2s ease' }}
          />

          {/* Central Spine Beam */}
          <rect
            x="196"
            y="40"
            width="8"
            height="320"
            fill="var(--accent-primary)"
            className={animated ? 'animate-pulse' : ''}
          />
        </svg>
      </div>

      {showText && (
        <span
          style={{
            fontSize: `${size * 0.65}px`,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: 'var(--text-primary)',
            fontFamily: 'Geist, sans-serif',
          }}
        >
          Skil<span style={{ color: 'var(--accent-primary)' }}>lo</span>
        </span>
      )}
    </div>
  );
}
