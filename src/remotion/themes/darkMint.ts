/* Dark Mint Theme Constants */

export const DARK_MINT = {
  bg: {
    primary: '#0a0a0a',
    secondary: '#111111',
    card: '#1a1a1a',
    cardHover: '#222222',
  },
  accent: {
    primary: '#00FF88',
    secondary: '#00CC6A',
    tertiary: '#00AA55',
    glow: 'rgba(0, 255, 136, 0.3)',
    glowLight: 'rgba(0, 255, 136, 0.15)',
    glowStrong: 'rgba(0, 255, 136, 0.5)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#888888',
    muted: '#555555',
    accent: '#00FF88',
  },
  border: {
    default: 'rgba(0, 255, 136, 0.2)',
    light: 'rgba(0, 255, 136, 0.1)',
    strong: 'rgba(0, 255, 136, 0.4)',
  },
  status: {
    success: '#00FF88',
    warning: '#FFB800',
    error: '#FF4444',
    info: '#00AAFF',
  },
} as const;

export type DarkMintTheme = typeof DARK_MINT;
