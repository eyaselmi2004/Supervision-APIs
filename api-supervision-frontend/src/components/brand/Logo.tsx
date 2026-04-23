import React from 'react'

interface LogoProps {
  size?: number
  className?: string
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '' }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoAccent" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0abfc" />
          <stop offset="0.55" stopColor="#d946ef" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>

      <rect
        x="3.5"
        y="3.5"
        width="29"
        height="29"
        rx="10"
        fill="#10081d"
        stroke="rgba(255,255,255,0.22)"
      />

      <path
        d="M18 8.8L24.2 11.9V18.2C24.2 22.3 21.5 25.8 18 27.2C14.5 25.8 11.8 22.3 11.8 18.2V11.9L18 8.8Z"
        stroke="url(#logoAccent)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(14, 165, 233, 0.08)"
      />
      <path
        d="M18 13L14.8 22.4H16.7L17.35 20.35H20.65L21.3 22.4H23.2L20 13H18ZM17.9 18.65L19 15.2L20.1 18.65H17.9Z"
        fill="#fdf4ff"
      />
    </svg>
  </div>
)

export const LogoWithText: React.FC<{ size?: number; className?: string }> = ({ 
  size = 32, 
  className = ''
}) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <Logo size={size} />
    <div className="flex flex-col">
      <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
        API<span style={{ color: '#d946ef' }}>.Guard</span>
      </span>
      <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
        Supervision
      </span>
    </div>
  </div>
)
