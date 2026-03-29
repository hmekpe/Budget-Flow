// ── AppBar Component (Vanilla HTML/CSS/JS) ─────────────────────────────────

// Icon SVG paths
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bars: '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',
  plus: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'budget', label: 'Budget', icon: 'bars' },
  { id: 'add', label: 'Add Transaction', icon: 'plus', special: true },
  { id: 'activity', label: 'Activity', icon: 'pulse' },
  { id: 'report', label: 'Financial Report', icon: 'trend' }
];

// Create icon SVG element
function createIcon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// Create the AppBar HTML
function createAppBar(activePage = 'budget', onNavigate = null) {
  // Build nav items HTML
  const navItemsHTML = NAV_ITEMS.map(item => {
    const isActive = activePage === item.id;
    const isSpecial = item.special;
    const activeClass = isActive && !isSpecial ? ' active' : '';
    const specialClass = isSpecial ? ' special' : '';
    
    const activeDot = isActive && !isSpecial 
      ? '<span class="active-dot"></span>' 
      : '';
    
    return `
      <button class="nav-btn${activeClass}${specialClass}" data-id="${item.id}">
        <span class="nav-icon">${createIcon(item.icon)}</span>
        <span class="nav-label">${item.label}</span>
        ${activeDot}
      </button>
    `;
  }).join('');

  // Settings button
  const settingsActive = activePage === 'settings' ? ' active' : '';
  const settingsDot = activePage === 'settings' ? '<span class="active-dot"></span>' : '';

  return `
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
    
    <aside class="appbar">
      <!-- Logo -->
      <div class="appbar-logo">
        <div class="logo-icon">🪙</div>
        <span class="logo-text">Budget-Flow</span>
      </div>

      <!-- Nav Items -->
      <nav class="appbar-nav">
        ${navItemsHTML}
      </nav>

      <!-- Settings -->
      <div class="appbar-settings">
        <button class="nav-btn${settingsActive}" data-id="settings">
          <span class="nav-icon">${createIcon('cog')}</span>
          <span class="nav-label">Settings</span>
          ${settingsDot}
        </button>
      </div>
    </aside>

    <style>
      .appbar {
        width: 260px;
        height: 100vh;
        background: #120847;
        display: flex;
        flex-direction: column;
        font-family: 'DM Sans', sans-serif;
        border-right: 1px solid rgba(255,255,255,0.06);
        position: fixed;
        left: 0;
        top: 0;
        z-index: 100;
      }

      .appbar-logo {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 28px 20px 24px;
      }

      .logo-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: rgba(175,174,215,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }

      .logo-text {
        font-family: 'Syne', sans-serif;
        font-weight: 800;
        font-size: 20px;
        color: #AFAED7;
        letter-spacing: -0.3px;
      }

      .appbar-nav {
        flex: 1;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 2;
      }

      .appbar-settings {
        padding: 12px 12px 24px;
        border-top: 1px solid rgba(255,255,255,0.07);
      }

      .nav-btn {
        all: unset;
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 13px 16px;
        border-radius: 12px;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        font-size: 15px;
        font-weight: 400;
        color: rgba(255,255,255,0.72);
        transition: background 0.15s, color 0.15s;
        box-sizing: border-box;
      }

      .nav-btn:hover {
        background: rgba(255,255,255,0.05);
      }

      .nav-btn.active {
        background: rgba(222, 92, 92, 0.18);
        color: #DE5C5C;
        font-weight: 600;
      }

      .nav-btn.special {
        color: #DE5C5C;
        background: rgba(222, 92, 92, 0.08);
        border: 1.5px dashed rgba(222, 92, 92, 0.5);
        margin: 6px 0;
        font-weight: 600;
      }

      .nav-btn.special:hover {
        background: rgba(222, 92, 92, 0.14);
      }

      .nav-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-icon svg {
        width: 20px;
        height: 20px;
      }

      .nav-label {
        white-space: nowrap;
      }

      .active-dot {
        margin-left: auto;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #DE5C5C;
        flex-shrink: 0;
      }
    </style>
  `;
}

// Initialize AppBar - call this after DOM is loaded
function initAppBar(containerId, activePage = 'budget', onNavigate = null) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element '${containerId}' not found`);
    return;
  }

  container.innerHTML = createAppBar(activePage, onNavigate);

  // Add click handlers
  const buttons = container.querySelectorAll('.nav-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      
      // Update active state
      buttons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Add active dot if not special button
      if (!this.classList.contains('special')) {
        // Remove existing dots
        container.querySelectorAll('.active-dot').forEach(dot => dot.remove());
        // Add new dot
        const dot = document.createElement('span');
        dot.className = 'active-dot';
        this.appendChild(dot);
      }

      // Call navigation callback
      if (onNavigate) {
        onNavigate(id);
      }
    });
  });
}

// Export for use in other files
window.AppBar = {
  create: createAppBar,
  init: initAppBar
};