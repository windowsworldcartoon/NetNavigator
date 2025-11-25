/**
 * Icon Configuration for NetNavigator
 * Maps icon names to local SVG files from /public/icons/
 * 
 * Icon Set: Remix Icon (https://remixicon.com/)
 * Folders: System, Device, Media, Editor, etc.
 * Style: Line icons (suffix -line)
 */

const ICONS_BASE_PATH = './icons/System';

const iconMappings = {
  // Navigation icons
  dashboard: 'dashboard-line',
  scanner: 'scan-line',  // Using scan from Device folder
  port: 'router-line',  // Port = router (Device)
  dns: 'information-line',
  monitor: 'radar-line',  // Network monitoring (Device)
  info: 'information-line',
  diagnostics: 'settings-line',
  'packet-analysis': 'rss-line',  // Network packets (Device)
  'server-maker': 'server-line',  // Server (Device)
  optimize: 'settings-line',
  settings: 'settings-line',
  
  // Header icons
  search: 'search-line',
  sun: 'settings-line',  // Not available
  moon: 'settings-line',
  help: 'question-line',
  
  // Dashboard icons
  wifi: 'wifi-line',  // WiFi (Device)
  'network-search': 'scan-line',  // Scan (Device)
  'port-check': 'router-line',  // Router (Device)
  'dns-lookup': 'information-line',
  
  // Action icons
  play: 'settings-line',  // Not available
  stop: 'close-line',
  trash: 'delete-bin-line',
  download: 'download-line',
  upload: 'upload-line',
  refresh: 'refresh-line',
  plus: 'add-line',
  minus: 'subtract-line',
  close: 'close-line',
  menu: 'menu-line',
  check: 'check-line',
  alert: 'alert-line',
  
  // Device folder mappings (suffix -Device)
  'wifi-Device': 'wifi-line',
  'router-Device': 'router-line',
  'server-Device': 'server-line',
  'scan-Device': 'scan-line',
  'radar-Device': 'radar-line',
  'rss-Device': 'rss-line',
  'cpu-Device': 'cpu-line',
  'database-Device': 'database-line',
  'hard-drive-Device': 'hard-drive-line',
  'smartphone-Device': 'smartphone-line',
};

/**
 * Get the full path to an icon SVG file
 * @param {string} iconName - The icon name from mappings
 * @param {string} folder - Optional folder override (default: System)
 * @returns {string} The full path to the SVG file
 */
function getIconPath(iconName, folder = 'System') {
  const fileName = iconMappings[iconName] || iconName;
  return `./icons/${folder}/${fileName}.svg`;
}

/**
 * Get icon from Device folder (network, device, connectivity icons)
 * @param {string} iconName - Icon name (e.g., 'wifi', 'router', 'signal-wifi')
 * @returns {string} Full path to icon
 */
function getDeviceIcon(iconName) {
  return getIconPath(iconName, 'Device');
}

/**
 * Load an icon and return as HTML element
 * @param {string} iconName - The icon name
 * @param {object} options - Configuration options
 * @returns {Promise<HTMLElement>} The icon element
 */
async function loadIcon(iconName, options = {}) {
  const {
    width = 24,
    height = 24,
    className = '',
    stroke = 2,
    folder = 'System',
  } = options;

  try {
    const iconPath = getIconPath(iconName, folder);
    
    // Create img element
    const img = document.createElement('img');
    img.src = iconPath;
    img.alt = iconName;
    img.width = width;
    img.height = height;
    img.style.display = 'block';
    img.style.strokeWidth = stroke;
    
    if (className) {
      img.className = className;
    }
    
    return img;
  } catch (error) {
    console.error(`Failed to load icon: ${iconName}`, error);
    // Return placeholder
    const placeholder = document.createElement('span');
    placeholder.textContent = '⚠️';
    return placeholder;
  }
}

/**
 * Replace Font Awesome icons in HTML with local SVG icons
 * Maps common Font Awesome classes to icon names
 */
function replaceFontAwesomeIcons() {
  const fontAwesomeMap = {
    'fa-wifi': 'wifi',
    'fa-search': 'search',
    'fa-plug': 'plug',
    'fa-globe': 'globe',
    'fa-eye': 'eye',
    'fa-info-circle': 'info-circle',
    'fa-cog': 'settings',
    'fa-terminal': 'terminal',
    'fa-redo': 'refresh-cw',
    'fa-times': 'x',
    'fa-trash': 'trash-2',
    'fa-download': 'download',
    'fa-upload': 'upload',
    'fa-plus': 'plus',
    'fa-minus': 'minus',
    'fa-check': 'check',
    'fa-alert-circle': 'alert-circle',
    'fa-menu': 'menu',
    'fa-moon': 'moon',
    'fa-sun': 'sun',
  };

  // Find all Font Awesome icons
  document.querySelectorAll('[class*="fa-"]').forEach((el) => {
    const iconClass = Array.from(el.classList)
      .find(cls => cls.startsWith('fa-'));
    
    if (iconClass && fontAwesomeMap[iconClass]) {
      const iconName = fontAwesomeMap[iconClass];
      const iconPath = getIconPath(iconName);
      
      // Create SVG img
      const img = document.createElement('img');
      img.src = iconPath;
      img.alt = iconName;
      img.width = 16;
      img.height = 16;
      img.style.display = 'inline-block';
      img.style.marginRight = '8px';
      
      // Replace the <i> tag
      el.replaceWith(img);
    }
  });
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getIconPath,
    getDeviceIcon,
    loadIcon,
    replaceFontAwesomeIcons,
    iconMappings,
    ICONS_BASE_PATH,
  };
}
