/* Optional adapter for Tailwind 3. Import tokens.css before consuming these classes. */
const { breakpoint } = require('./tokens.json');
module.exports = {
  theme: {
    extend: {
      colors: {
        'kb-bg': 'var(--kb-bg)', 'kb-surface': 'var(--kb-surface)',
        'kb-text': 'var(--kb-text)', 'kb-muted': 'var(--kb-text-muted)',
        'kb-blue': 'var(--kb-accent)', 'kb-border': 'var(--kb-border)',
        'kb-success': 'var(--kb-success)', 'kb-danger': 'var(--kb-danger)'
      },
      fontFamily: { 'kb-sans': ['Archivo', 'Arial', 'sans-serif'], 'kb-mono': ['IBM Plex Mono', 'monospace'] },
      borderRadius: { 'kb-sm':'var(--kb-radius-sm)', 'kb-md':'var(--kb-radius-md)', 'kb-lg':'var(--kb-radius-lg)', 'kb-pill':'var(--kb-radius-pill)' },
      spacing: { 'kb-section':'var(--kb-layout-section)', 'kb-gutter':'var(--kb-layout-gutter)' },
      screens: Object.fromEntries(Object.entries(breakpoint).map(([key,value]) => ['kb-'+key,value+'px']))
    }
  }
};
