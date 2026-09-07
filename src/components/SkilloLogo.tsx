
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
    <div className={`inline-flex items-center gap-3 ${className}`}>
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
          style={{
            width: '100%',
            height: '100%',
            overflow: 'visible',
            filter: animated ? 'drop-shadow(0 0 12px rgba(0, 229, 255, 0.35))' : 'none',
            transition: 'filter 0.3s ease',
          }}
        >
          <defs>
            <filter id="skilloCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Left Upper Wing */}
          <polygon
            points="76,40 186,40 186,200"
            fill="#FFFFFF"
            style={{ transition: 'opacity 0.2s ease' }}
          />

          {/* Left Lower Wing */}
          <polygon
            points="186,200 186,360 76,360"
            fill="#FFFFFF"
            style={{ transition: 'opacity 0.2s ease' }}
          />

          {/* Right Upper Wing */}
          <polygon
            points="214,40 324,40 214,200"
            fill="#FFFFFF"
            style={{ transition: 'opacity 0.2s ease' }}
          />

          {/* Right Lower Wing */}
          <polygon
            points="214,200 324,360 214,360"
            fill="#FFFFFF"
            style={{ transition: 'opacity 0.2s ease' }}
          />

          {/* Central Laser Beam */}
          <rect
            x="196"
            y="40"
            width="8"
            height="320"
            fill="#00E5FF"
            filter="url(#skilloCyanGlow)"
            className={animated ? 'animate-pulse' : ''}
          />
        </svg>
      </div>

      {showText && (
        <span
          style={{
            fontSize: `${size * 0.7}px`,
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            color: 'var(--text-main)',
          }}
        >
          Skil<span className="text-cyan">lo</span>
        </span>
      )}
    </div>
  );
}
