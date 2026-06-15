const state = {
  entries: [],
  themes: new Map(),
  index: 0,
};

const elements = {
  accent: document.getElementById('theme-accent'),
  editor: document.getElementById('theme-editor'),
  name: document.getElementById('theme-name'),
  next: document.getElementById('next-theme'),
  palette: document.getElementById('palette-grid'),
  position: document.getElementById('theme-position'),
  previous: document.getElementById('previous-theme'),
  select: document.getElementById('theme-select'),
  sidebar: document.getElementById('theme-sidebar'),
  sidebarBadge: document.getElementById('sidebar-badge'),
  statusThemeName: document.getElementById('status-theme-name'),
  terminalSwatches: document.getElementById('terminal-swatches'),
  type: document.getElementById('theme-type'),
};

const tokenScopes = {
  comment: ['comment', 'punctuation.definition.comment'],
  string: ['string', 'punctuation.definition.string'],
  keyword: ['keyword', 'storage', 'storage.type'],
  function: ['entity.name.function', 'support.function', 'meta.function-call'],
  type: ['entity.name.type', 'support.type', 'storage.type'],
  number: ['constant.numeric', 'number'],
  variable: ['variable', 'variable.other.readwrite'],
  parameter: ['variable.parameter'],
  property: ['variable.other.property', 'support.variable.property'],
  punctuation: ['punctuation', 'meta.brace', 'meta.delimiter'],
};

const semanticScopes = {
  function: ['function', 'method'],
  type: ['class', 'type', 'interface', 'enum'],
  variable: ['variable'],
  parameter: ['parameter'],
  property: ['property', 'enumMember'],
};

const terminalColorKeys = [
  ['black', 'terminal.ansiBlack'],
  ['red', 'terminal.ansiRed'],
  ['green', 'terminal.ansiGreen'],
  ['yellow', 'terminal.ansiYellow'],
  ['blue', 'terminal.ansiBlue'],
  ['magenta', 'terminal.ansiMagenta'],
  ['cyan', 'terminal.ansiCyan'],
  ['white', 'terminal.ansiWhite'],
];

const paletteEntries = [
  ['Accent', 'focusBorder', ['activityBar.foreground', 'statusBar.foreground']],
  ['Editor', 'editor.background', []],
  ['Sidebar', 'sideBar.background', []],
  ['Terminal', 'terminal.background', ['panel.background']],
  ['Selection', 'editor.selectionBackground', []],
  ['Button', 'button.background', []],
];

function getThemeColor(theme, key, fallbackKeys = [], defaultColor = '#888888') {
  const colors = theme.colors || {};
  const keys = [key, ...fallbackKeys];

  for (const candidate of keys) {
    if (candidate && colors[candidate]) {
      return colors[candidate];
    }
  }

  return defaultColor;
}

function getSemanticColor(theme, candidates) {
  const semanticColors = theme.semanticTokenColors || {};

  for (const candidate of candidates) {
    const value = semanticColors[candidate];
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value.foreground === 'string') {
      return value.foreground;
    }
  }

  return null;
}

function normalizeScopes(scope) {
  if (Array.isArray(scope)) {
    return scope.flatMap((entry) => String(entry).split(',')).map((entry) => entry.trim()).filter(Boolean);
  }

  return String(scope || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function matchesScope(ruleScope, candidate) {
  return (
    ruleScope === candidate ||
    ruleScope.startsWith(`${candidate}.`) ||
    candidate.startsWith(`${ruleScope}.`) ||
    ruleScope.includes(candidate)
  );
}

function getTokenColor(theme, candidates, defaultColor) {
  const tokenColors = Array.isArray(theme.tokenColors) ? theme.tokenColors : [];

  for (const candidate of candidates) {
    for (const rule of tokenColors) {
      const ruleScopes = normalizeScopes(rule.scope);
      if (!ruleScopes.length || !rule.settings || !rule.settings.foreground) {
        continue;
      }

      if (ruleScopes.some((ruleScope) => matchesScope(ruleScope, candidate))) {
        return rule.settings.foreground;
      }
    }
  }

  return defaultColor;
}

function setVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function renderPalette(theme) {
  elements.palette.innerHTML = '';

  for (const [label, primaryKey, fallbackKeys] of paletteEntries) {
    const color = getThemeColor(theme, primaryKey, fallbackKeys);
    const card = document.createElement('article');
    card.className = 'palette-card';
    card.innerHTML = `
      <header>
        <div>
          <strong>${label}</strong>
          <span>${primaryKey}</span>
        </div>
        <span>${color}</span>
      </header>
      <div class="palette-preview" style="background:${color}"></div>
    `;
    elements.palette.append(card);
  }
}

function renderTerminalSwatches(theme) {
  elements.terminalSwatches.innerHTML = '';

  for (const [label, key] of terminalColorKeys) {
    const color = getThemeColor(theme, key, [], '#666666');
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.innerHTML = `
      <div class="swatch-chip" style="background:${color}"></div>
      <span class="swatch-label">${label}</span>
    `;
    elements.terminalSwatches.append(swatch);
  }
}

function applyThemeTokens(theme) {
  const defaults = {
    comment: '#6c7794',
    string: '#d89d63',
    keyword: '#72b7ff',
    function: '#83f2c7',
    type: '#b9a3ff',
    number: '#f0d96f',
    variable: getThemeColor(theme, 'editor.foreground', [], '#d6deeb'),
    parameter: getThemeColor(theme, 'editor.foreground', [], '#d6deeb'),
    property: '#7fd3ff',
    punctuation: getThemeColor(theme, 'editor.foreground', [], '#d6deeb'),
  };

  for (const [tokenName, scopes] of Object.entries(tokenScopes)) {
    const semanticColor = semanticScopes[tokenName] ? getSemanticColor(theme, semanticScopes[tokenName]) : null;
    const color = semanticColor || getTokenColor(theme, scopes, defaults[tokenName]);
    setVar(`--token-${tokenName}`, color);
  }

  setVar('--token-operator', getThemeColor(theme, 'editor.foreground', [], defaults.punctuation));
}

function applyThemeChrome(entry, theme) {
  const accent = getThemeColor(theme, 'focusBorder', ['activityBar.foreground', 'statusBar.foreground'], '#66eeaa');
  const sidebarBackground = getThemeColor(theme, 'sideBar.background', [], '#161a28');
  const sidebarSelection = getThemeColor(
    theme,
    'list.activeSelectionBackground',
    ['list.focusBackground', 'list.hoverBackground'],
    'rgba(255,255,255,0.08)'
  );
  const panelBackground = getThemeColor(theme, 'panel.background', ['terminal.background'], '#17171f');
  const terminalBackground = getThemeColor(theme, 'terminal.background', ['panel.background'], panelBackground);

  setVar('--shell-gradient-start', getThemeColor(theme, 'titleBar.activeBackground', ['activityBar.background'], '#0d1322'));
  setVar('--shell-gradient-end', getThemeColor(theme, 'editor.background', [], '#131b2f'));
  setVar('--focus-ring', accent);
  setVar('--button-background', getThemeColor(theme, 'button.background', ['activityBar.background'], 'rgba(255,255,255,0.08)'));
  setVar('--button-foreground', getThemeColor(theme, 'button.foreground', ['foreground'], '#f6f7fb'));
  setVar('--button-hover', getThemeColor(theme, 'button.hoverBackground', ['list.hoverBackground'], 'rgba(255,255,255,0.14)'));
  setVar('--window-background', getThemeColor(theme, 'editor.background', [], '#0f0f17'));
  setVar('--titlebar-background', getThemeColor(theme, 'titleBar.activeBackground', ['activityBar.background'], '#07070f'));
  setVar('--titlebar-foreground', getThemeColor(theme, 'titleBar.activeForeground', ['foreground'], '#bbccee'));
  setVar('--activity-bar-background', getThemeColor(theme, 'activityBar.background', [], '#0f0f17'));
  setVar('--activity-bar-foreground', getThemeColor(theme, 'activityBar.foreground', ['focusBorder'], accent));
  setVar('--activity-bar-muted', getThemeColor(theme, 'activityBar.inactiveForeground', ['foreground'], 'rgba(255,255,255,0.45)'));
  setVar('--sidebar-background', sidebarBackground);
  setVar('--sidebar-foreground', getThemeColor(theme, 'sideBar.foreground', ['foreground'], '#bbccee'));
  setVar('--sidebar-section-background', getThemeColor(theme, 'sideBarSectionHeader.background', ['list.hoverBackground'], 'rgba(255,255,255,0.05)'));
  setVar('--sidebar-selection-background', sidebarSelection);
  setVar('--sidebar-selection-foreground', getThemeColor(theme, 'list.activeSelectionForeground', ['sideBar.foreground'], '#bbccee'));
  setVar('--badge-background', getThemeColor(theme, 'badge.background', ['activityBarBadge.background'], accent));
  setVar('--badge-foreground', getThemeColor(theme, 'badge.foreground', ['activityBarBadge.foreground'], '#0f0f17'));
  setVar('--editor-background', getThemeColor(theme, 'editor.background', [], '#0f0f17'));
  setVar('--editor-foreground', getThemeColor(theme, 'editor.foreground', ['foreground'], '#bbccee'));
  setVar('--editor-line-number', getThemeColor(theme, 'editorLineNumber.foreground', ['foreground'], '#5f6984'));
  setVar('--editor-active-line-number', getThemeColor(theme, 'editorLineNumber.activeForeground', ['focusBorder'], accent));
  setVar('--editor-selection', getThemeColor(theme, 'editor.selectionBackground', ['selection.background'], 'rgba(255,255,255,0.12)'));
  setVar('--editor-line-highlight', getThemeColor(theme, 'editor.lineHighlightBackground', [], 'rgba(255,255,255,0.05)'));
  setVar('--editor-accent', accent);
  setVar('--panel-background', panelBackground);
  setVar('--panel-foreground', getThemeColor(theme, 'panelTitle.inactiveForeground', ['foreground'], '#bbccee'));
  setVar('--terminal-background', terminalBackground);
  setVar('--terminal-foreground', getThemeColor(theme, 'terminal.foreground', ['foreground'], '#bbccee'));
  setVar('--statusbar-background', getThemeColor(theme, 'statusBar.background', ['activityBar.background'], '#0f0f17'));
  setVar('--statusbar-foreground', getThemeColor(theme, 'statusBar.foreground', ['activityBar.foreground'], accent));
  setVar('--terminal-accent', getThemeColor(theme, 'terminalCursor.foreground', ['focusBorder'], accent));

  elements.name.textContent = entry.label;
  elements.type.textContent = `${theme.type || entry.uiTheme || 'unknown'} theme`;
  elements.accent.textContent = accent;
  elements.editor.textContent = getThemeColor(theme, 'editor.background');
  elements.sidebar.textContent = sidebarBackground;
  elements.position.textContent = `${state.index + 1} of ${state.entries.length} • Use Left/Right to cycle`;
  elements.sidebarBadge.textContent = String(state.index + 1).padStart(2, '0');
  elements.statusThemeName.textContent = entry.label;
}

async function loadTheme(entry) {
  if (state.themes.has(entry.path)) {
    return state.themes.get(entry.path);
  }

  const response = await fetch(entry.path);
  if (!response.ok) {
    throw new Error(`Failed to load ${entry.path}`);
  }

  const theme = await response.json();
  state.themes.set(entry.path, theme);
  return theme;
}

function updateSelect() {
  elements.select.innerHTML = '';

  state.entries.forEach((entry, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = entry.label;
    elements.select.append(option);
  });
}

async function renderTheme(index) {
  state.index = (index + state.entries.length) % state.entries.length;
  const entry = state.entries[state.index];
  const theme = await loadTheme(entry);

  elements.select.value = String(state.index);
  applyThemeChrome(entry, theme);
  applyThemeTokens(theme);
  renderPalette(theme);
  renderTerminalSwatches(theme);
}

async function bootstrap() {
  const manifestResponse = await fetch('/package.json');
  if (!manifestResponse.ok) {
    throw new Error('Failed to load extension manifest.');
  }

  const manifest = await manifestResponse.json();
  state.entries = (manifest.contributes?.themes || []).map((entry) => ({
    label: entry.label,
    path: entry.path.replace(/^\.\//, '/'),
    uiTheme: entry.uiTheme,
  }));

  if (!state.entries.length) {
    throw new Error('No themes found in package.json.');
  }

  updateSelect();
  await renderTheme(0);

  elements.previous.addEventListener('click', () => {
    renderTheme(state.index - 1);
  });

  elements.next.addEventListener('click', () => {
    renderTheme(state.index + 1);
  });

  elements.select.addEventListener('change', (event) => {
    renderTheme(Number(event.target.value));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      renderTheme(state.index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      renderTheme(state.index + 1);
    }
  });
}

bootstrap().catch((error) => {
  elements.name.textContent = 'Preview failed to load';
  elements.position.textContent = error.message;
  console.error(error);
});
