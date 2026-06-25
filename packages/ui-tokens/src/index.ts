/** EasyGo design tokens (mirrors the design mocks). Import the matching CSS
 *  variables from `@easygo/ui-tokens/tokens.css`. */

export const colors = {
  brand: '#56A919',
  brandDark: '#3E7C12',
  brandLight: '#EEF6E6',
  brandBright: '#7BD93C',
  ink: '#16181C',
  inkSoft: '#3A3F45',
  muted: '#6E747C',
  hint: '#9AA0A6',
  line: '#ECEEE9',
  border: '#E2E5DF',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F7F5',
  page: '#E7E9E3',
  // status palette (bg, fg) used by chips
  statusGreen: ['#EEF6E6', '#3E7C12'],
  statusBlue: ['#E6EFFB', '#2C66C9'],
  statusGrey: ['#F0F1EE', '#8A8F86'],
  statusRed: ['#FBEDEA', '#C0492E'],
  statusAmber: ['#FEF3E2', '#C77A18'],
  whatsapp: '#25D366',
} as const;

export const font = {
  family: "'Manrope', system-ui, -apple-system, sans-serif",
  icons: "'Material Symbols Outlined'",
} as const;

export const radius = {
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '22px',
  pill: '999px',
} as const;

export const space = (n: number): string => `${n * 4}px`;
