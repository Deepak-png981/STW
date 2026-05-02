export const SHAME_THE_WEB_DASHBOARD_ORIGINS = [
  "http://localhost:5173",
  "https://shametheweb.com",
  "https://www.shametheweb.com"
] as const;

export const designTokens = {
  color: {
    appBackground: "#C9D67A",
    shellOutline: "#1F1F22",
    sidebarBackground: "#19191D",
    mainSurface: "#E7E7E7",
    cardSurfaceLight: "#F3F3F1",
    cardSurfaceDark: "#1C1C20",
    textPrimaryOnLight: "#101114",
    textSecondaryOnLight: "#5E6066",
    textPrimaryOnDark: "#F7F7F4",
    textSecondaryOnDark: "#B8BBC2",
    borderSubtle: "#D9D9D6",
    accentLime: "#D7EB59",
    accentLavender: "#BEB2F6",
    accentSoftPurple: "#CFC7FA",
    accentChartDark: "#202025",
    accentMutedOlive: "#9AA05A"
  },
  radius: {
    small: 10,
    medium: 16,
    large: 24,
    xl: 32,
    card: 24,
    pill: 999
  },
  spacing: {
    baseUnit: 8,
    micro: 4,
    tight: 8,
    compact: 12,
    card: 16,
    section: 20,
    page: 32,
    hero: 40
  },
  motion: {
    microMs: 120,
    standardMs: 180,
    panelMs: 240,
    easing: "ease-out"
  },
  typography: {
    family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    displayFamily: 'Kablammo, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    displayWeight: 600,
    metricWeight: 500,
    bodyWeight: 400,
    labelWeight: 500
  }
} as const;

export function designTokensAsCssVariables(selector = ":root"): string {
  return `${selector} {
  --stw-app-background: ${designTokens.color.appBackground};
  --stw-shell-outline: ${designTokens.color.shellOutline};
  --stw-sidebar-background: ${designTokens.color.sidebarBackground};
  --stw-main-surface: ${designTokens.color.mainSurface};
  --stw-card-surface-light: ${designTokens.color.cardSurfaceLight};
  --stw-card-surface-dark: ${designTokens.color.cardSurfaceDark};
  --stw-text-primary-light: ${designTokens.color.textPrimaryOnLight};
  --stw-text-secondary-light: ${designTokens.color.textSecondaryOnLight};
  --stw-text-primary-dark: ${designTokens.color.textPrimaryOnDark};
  --stw-text-secondary-dark: ${designTokens.color.textSecondaryOnDark};
  --stw-border-subtle: ${designTokens.color.borderSubtle};
  --stw-accent-lime: ${designTokens.color.accentLime};
  --stw-accent-lavender: ${designTokens.color.accentLavender};
  --stw-accent-soft-purple: ${designTokens.color.accentSoftPurple};
  --stw-accent-chart-dark: ${designTokens.color.accentChartDark};
  --stw-accent-muted-olive: ${designTokens.color.accentMutedOlive};
  --stw-radius-small: ${designTokens.radius.small}px;
  --stw-radius-medium: ${designTokens.radius.medium}px;
  --stw-radius-large: ${designTokens.radius.large}px;
  --stw-radius-xl: ${designTokens.radius.xl}px;
  --stw-radius-card: ${designTokens.radius.card}px;
  --stw-radius-shell: ${designTokens.radius.xl}px;
  --stw-radius-pill: ${designTokens.radius.pill}px;
  --stw-space-micro: ${designTokens.spacing.micro}px;
  --stw-space-tight: ${designTokens.spacing.tight}px;
  --stw-space-compact: ${designTokens.spacing.compact}px;
  --stw-space-card: ${designTokens.spacing.card}px;
  --stw-space-section: ${designTokens.spacing.section}px;
  --stw-space-page: ${designTokens.spacing.page}px;
  --stw-space-hero: ${designTokens.spacing.hero}px;
  --stw-motion-micro-ms: ${designTokens.motion.microMs}ms;
  --stw-motion-standard-ms: ${designTokens.motion.standardMs}ms;
  --stw-motion-panel-ms: ${designTokens.motion.panelMs}ms;
  --stw-motion-easing: ${designTokens.motion.easing};
  --stw-font-family: ${designTokens.typography.family};
  --stw-font-display: ${designTokens.typography.displayFamily};
}`;
}
