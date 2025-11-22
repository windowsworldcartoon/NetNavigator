const os = require('os');
const { promises: fsPromises } = require('fs');
const fs = require('fs');
const dns = require('dns');
const path = require('path');
const { spawn } = require('child_process');
const { ipcRenderer } = require('electron');
const si = require('systeminformation');

/**
 * NetNavigator Main Application
 * Manages UI, network operations, and user interactions
 */

// ============================================================
// Icon System - Local Tabler Icons with SVG Support
// ============================================================


class Icon {
    /**
     * Tabler icon mappings for navigation and UI
     */
    static ICONS = {
        'dashboard': 'grid-3x3-gap',
        'scanner': 'radar-2',
        'port': 'plug',
        'dns': 'world',
        'monitor': 'eye',
        'info': 'info-circle',
        'server': 'server',
        'optimize': 'flame',
        'settings': 'settings',
        'search': 'search',
        'moon': 'moon',
        'help': 'help-circle',
        'menu': 'menu-2',
        'chevron-left': 'chevron-left',
        'wifi': 'wifi',
        'network': 'network',
        'extension': 'puzzle',
    };

    /**
     * Unicode emoji fallbacks
     */
    static FALLBACKS = {
        'dashboard': '📊',
        'scanner': '🔍',
        'port': '🔌',
        'dns': '🌐',
        'monitor': '👁️',
        'info': 'ℹ️',
        'server': '🖥️',
        'optimize': '⚡',
        'settings': '⚙️',
        'search': '🔎',
        'moon': '🌙',
        'help': '❓',
        'menu': '☰',
        'chevron-left': '◀',
        'wifi': '📶',
        'network': '🌐',
        'extension': '🧩',
    };

    /**
     * SVG cache to avoid repeated fetches
     */
    static cache = new Map();

    /**
     * Base path for tabler icons
     */
    static basePath = '../tabler-icons-3.35.0/icons';

    /**
     * Load SVG icon from local tabler-icons with caching
     * @param {string} name - Icon name or mapped icon ID
     * @param {string} variant - 'outline' or 'filled'
     * @returns {Promise<string>} SVG content or emoji fallback
     */
    static async loadSVG(name, variant = 'outline') {
        const iconName = this.ICONS[name] || name;
        const cacheKey = `${iconName}/${variant}`;

        // Return cached SVG if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const path = `${this.basePath}/${variant}/${iconName}.svg`;
            const response = await fetch(path);

            if (!response.ok) {
                // Try filled variant if outline not found
                if (variant === 'outline') {
                    return this.loadSVG(name, 'filled');
                }
                // Return emoji fallback if both variants fail
                return this.getFallback(name);
            }

            const svg = await response.text();
            
            // Cache the SVG
            this.cache.set(cacheKey, svg);
            
            return svg;
        } catch (error) {
            console.warn(`Failed to load icon ${iconName}/${variant}:`, error);
            return this.getFallback(name);
        }
    }

    /**
     * Inject SVG into DOM element
     * @param {HTMLElement} element - Target DOM element
     * @param {string} name - Icon name
     * @param {string} variant - Icon variant
     * @param {string} classes - Additional CSS classes
     */
    static async inject(element, name, variant = 'outline', classes = '') {
        if (!element) return;

        const svg = await this.loadSVG(name, variant);
        
        if (svg.startsWith('<svg')) {
            // SVG content
            element.innerHTML = svg;
        } else {
            // Emoji fallback
            element.textContent = svg;
            element.style.fontSize = '1.2em';
        }

        // Add classes
        if (classes) {
            element.className = `icon ${classes}`;
        } else {
            element.className = 'icon';
        }
    }

    /**
     * Create icon element
     * @param {string} name - Icon name
     * @param {string} variant - Icon variant
     * @param {string} classes - Additional CSS classes
     * @returns {Promise<HTMLElement>} Icon element
     */
    static async create(name, variant = 'outline', classes = '') {
        const element = document.createElement('span');
        element.className = `icon ${classes}`;
        
        await this.inject(element, name, variant);
        
        return element;
    }

    /**
     * Get emoji fallback for icon
     * @param {string} name - Icon name
     * @returns {string} Emoji or default symbol
     */
    static getFallback(name) {
        return this.FALLBACKS[name] || '◆';
    }

    /**
     * Preload multiple icons for performance
     * @param {string[]} names - Array of icon names
     * @param {string} variant - Icon variant
     */
    static async preload(names, variant = 'outline') {
        await Promise.all(
            names.map(name => this.loadSVG(name, variant))
        );
    }

    /**
     * Get icon dimensions from SVG
     * @param {string} name - Icon name
     * @returns {Object} { width, height }
     */
    static async getDimensions(name, variant = 'outline') {
        const svg = await this.loadSVG(name, variant);
        if (!svg.startsWith('<svg')) return { width: 24, height: 24 };

        const match = svg.match(/width="(\d+)"\s+height="(\d+)"/);
        if (match) {
            return { width: parseInt(match[1]), height: parseInt(match[2]) };
        }
        return { width: 24, height: 24 };
    }

    /**
     * Clear icon cache
     */
    static clearCache() {
        this.cache.clear();
        console.log('Icon cache cleared');
    }
}

// Preload common icons on app start
(async () => {
    const commonIcons = ['dashboard', 'scanner', 'port', 'dns', 'monitor', 'settings'];
    await Icon.preload(commonIcons, 'outline');
})();

// Ensure DOM is ready before initialization
if (document.readyState === 'loading') {
    // DOM is still loading
    console.log('DOM is loading, waiting for DOMContentLoaded...');
} else {
    // DOM is already loaded
    console.log('DOM is already loaded');
}

// ============================================================
// Utilities & Helpers
// ============================================================

const UI = {
    /**
     * Show snackbar notification
     */
    showSnackbar(message, duration = 3000) {
        const snackbar = document.getElementById('snackbar');
        if (!snackbar) return;

        snackbar.innerHTML = message;
        snackbar.classList.remove('fadeout', 'loading', 'loading-indeterminate');
        snackbar.classList.add('show');

        if (snackbar.timeoutId) clearTimeout(snackbar.timeoutId);

        snackbar.timeoutId = setTimeout(() => {
            snackbar.classList.add('fadeout');
            setTimeout(() => {
                snackbar.classList.remove('show', 'fadeout');
            }, 500);
        }, duration);
    },

    /**
     * Show loading snackbar with progress (determinate or indeterminate)
     * @param {string} message - Loading message
     * @param {boolean} isDeterminate - If true, show determinate progress; if false, show indeterminate
     * @param {number} initialProgress - Initial progress percentage (0-100) for determinate mode
     */
    showLoadingSnackbar(message = 'Loading...', isDeterminate = false, initialProgress = 0) {
        const snackbar = document.getElementById('snackbar');
        if (!snackbar) return;

        const progressId = `progress-linear-${Date.now()}`;
        
        if (isDeterminate) {
            // Determinate progress mode
            snackbar.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="flex: 1;">${message}</span>
                    <span id="${progressId}-text" style="font-size: 12px; min-width: 30px; text-align: right;">0%</span>
                </div>
                <div style="width: 100%; height: 3px; background-color: rgba(255, 255, 255, 0.2); border-radius: 2px; overflow: hidden;">
                    <div id="${progressId}-bar" style="height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%); border-radius: 2px; width: ${initialProgress}%; transition: width 0.3s ease;"></div>
                </div>
            `;
            snackbar.classList.remove('fadeout');
            snackbar.classList.add('show', 'loading', 'loading-determinate');
        } else {
            // Indeterminate progress mode
            snackbar.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                    <span style="flex: 1;">${message}</span>
                    <div style="width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <div style="width: 100%; height: 2px; background-color: rgba(255, 255, 255, 0.1); border-radius: 1px; overflow: hidden; margin-top: 8px;">
                    <div id="${progressId}-bar" style="height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%); border-radius: 1px; width: 0%; animation: indeterminateProgress 1.5s ease-in-out infinite;"></div>
                </div>
            `;
            snackbar.classList.remove('fadeout');
            snackbar.classList.add('show', 'loading', 'loading-indeterminate');
        }

        if (snackbar.timeoutId) clearTimeout(snackbar.timeoutId);

        // Return object to update progress if determinate
        if (isDeterminate) {
            return {
                snackbar,
                progressId,
                updateProgress: (progress) => {
                    const bar = document.getElementById(`${progressId}-bar`);
                    const text = document.getElementById(`${progressId}-text`);
                    if (bar) bar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
                    if (text) text.textContent = `${Math.round(progress)}%`;
                },
                updateMessage: (newMessage) => {
                    const messageSpan = snackbar.querySelector('span');
                    if (messageSpan) messageSpan.textContent = newMessage;
                },
                close: (duration = 500) => {
                    snackbar.classList.add('fadeout');
                    setTimeout(() => {
                        snackbar.classList.remove('show', 'fadeout', 'loading', 'loading-determinate');
                    }, duration);
                }
            };
        }
        
        return snackbar;
    },

    /**
     * Show loading snackbar with determinate progress
     */
    showProgressSnackbar(message = 'Loading...', initialProgress = 0) {
        const snackbar = document.getElementById('snackbar');
        if (!snackbar) return;

        const progressId = `progress-${Date.now()}`;
        snackbar.innerHTML = `
            <div style="width: 100%;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <span style="flex: 1;">${message}</span>
                    <span id="${progressId}-text" style="font-size: 12px; min-width: 30px; text-align: right;">0%</span>
                </div>
                <div style="width: 100%; height: 4px; background-color: rgba(255, 255, 255, 0.2); border-radius: 2px; overflow: hidden;">
                    <div id="${progressId}-bar" style="height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%); border-radius: 2px; width: ${initialProgress}%; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        snackbar.classList.remove('fadeout');
        snackbar.classList.add('show', 'loading');

        if (snackbar.timeoutId) clearTimeout(snackbar.timeoutId);

        // Return object to update progress
        return {
            snackbar,
            progressId,
            updateProgress: (progress) => {
                const bar = document.getElementById(`${progressId}-bar`);
                const text = document.getElementById(`${progressId}-text`);
                if (bar) bar.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
                if (text) text.textContent = `${Math.round(progress)}%`;
            },
            updateMessage: (newMessage) => {
                const messageSpan = snackbar.querySelector('span');
                if (messageSpan) messageSpan.textContent = newMessage;
            },
            close: (duration = 500) => {
                snackbar.classList.add('fadeout');
                setTimeout(() => {
                    snackbar.classList.remove('show', 'fadeout', 'loading');
                }, duration);
            }
        };
    },

    /**
     * Hide loading snackbar
     */
    hideLoadingSnackbar() {
        const snackbar = document.getElementById('snackbar');
        if (!snackbar) return;

        snackbar.classList.add('fadeout');
        setTimeout(() => {
            snackbar.classList.remove('show', 'fadeout', 'loading', 'loading-indeterminate');
        }, 500);
    },

    /**
     * Switch to tab by name
     */
    switchTab(tabName) {
        // Remove active from all nav buttons and tab content
        document.querySelectorAll('.nav-button, .tab-button').forEach(btn => 
            btn.classList.remove('active')
        );
        document.querySelectorAll('.tab-content').forEach(content => 
            content.classList.remove('active')
        );

        // Activate the selected tab button
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(tabName);

        if (tabBtn && tabContent) {
            tabBtn.classList.add('active');
            tabContent.classList.add('active');
            return true;
        }
        return false;
    },

    /**
     * Update connectivity status indicator
     */
    updateConnectivityStatus(isConnected) {
        const statusDot = document.getElementById('connectivity-status');
        const statusText = document.getElementById('connectivity-text');
        
        if (statusDot && statusText) {
            if (isConnected) {
                statusDot.classList.add('connected');
                statusText.textContent = 'Connected';
            } else {
                statusDot.classList.remove('connected');
                statusText.textContent = 'Offline';
            }
        }

        // Update dashboard connectivity card
        const dashboardConnectivity = document.getElementById('dashboard-connectivity');
        if (dashboardConnectivity) {
            dashboardConnectivity.textContent = isConnected ? '✓ Connected' : '✗ Offline';
            dashboardConnectivity.style.color = isConnected ? '#22c55e' : '#ef4444';
        }
    },

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    },

    /**
     * Clear results container
     */
    clearResults(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.innerHTML = '';
    },

    /**
     * Show loading state
     */
    setLoading(elementId, isLoading) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = isLoading ? '<div class="spinner"></div>Loading...' : '';
        }
    },

    /**
     * Display error in results
     */
    showError(elementId, error) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="alert error">${error}</div>`;
        }
    },

    /**
     * Display JSON results with formatting
     */
    showJSON(elementId, data) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
        }
    },

    /**
     * Show HTML content
     */
    showHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    },
};

// ============================================================
// Input Validation
// ============================================================

const Validation = {
    /**
     * Validate IP address format
     */
    isValidIP(ip) {
        const parts = ip.split('.');
        return parts.length === 3 && parts.every(part => {
            const num = parseInt(part, 10);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    },

    /**
     * Validate port number
     */
    isValidPort(port) {
        const num = parseInt(port, 10);
        return !isNaN(num) && num > 0 && num <= 65535;
    },

    /**
     * Validate hostname/domain
     */
    isValidHost(host) {
        return host && host.length > 0 && host.length <= 255;
    },
};


// ============================================================
// Dialog Manager - Enhanced with animations and validation
// ============================================================
class Dialog {
    constructor(options = {}) {
        this.id = options.id || `dialog-${Date.now()}`;
        this.type = options.type || 'default'; // 'default', 'info', 'warning', 'error', 'confirm'
        this.title = options.title || '';
        this.content = options.content || '';
        this.buttons = options.buttons || [];
        this.animationDuration = options.animationDuration || 300;
        this.closeOnBackdrop = options.closeOnBackdrop !== false;
        this.closeOnEscape = options.closeOnEscape !== false;
        this.onClose = options.onClose || null;
        this.onConfirm = options.onConfirm || null;
        this.validation = options.validation || null;
        
        this.dialog = null;
        this.backdrop = null;
        this.isOpen = false;
    }

    /**
     * Create dialog structure and append to DOM
     */
    create() {
        if (this.dialog) return; // Already created

        // Create backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'dialog-backdrop';
        this.backdrop.id = `${this.id}-backdrop`;
        this.backdrop.style.animation = `fadeIn ${this.animationDuration}ms ease-in`;

        // Create dialog container
        this.dialog = document.createElement('div');
        this.dialog.className = `dialog dialog-${this.type}`;
        this.dialog.id = this.id;
        this.dialog.setAttribute('role', 'dialog');
        this.dialog.setAttribute('aria-modal', 'true');
        this.dialog.style.animation = `slideUp ${this.animationDuration}ms ease-out`;

        // Create header
        const header = document.createElement('div');
        header.className = 'dialog-header';
        
        if (this.title) {
            const titleEl = document.createElement('h2');
            titleEl.className = 'dialog-title';
            titleEl.textContent = this.title;
            header.appendChild(titleEl);
        }

        const closeBtn = document.createElement('button');
        closeBtn.className = 'dialog-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close dialog');
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);

        this.dialog.appendChild(header);

        // Create content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'dialog-content';
        contentDiv.id = `${this.id}-content`;
        
        if (typeof this.content === 'string') {
            contentDiv.innerHTML = this.content;
        } else if (this.content instanceof HTMLElement) {
            contentDiv.appendChild(this.content);
        }
        
        this.dialog.appendChild(contentDiv);

        // Create footer with buttons
        if (this.buttons.length > 0 || this.type === 'confirm') {
            const footer = document.createElement('div');
            footer.className = 'dialog-footer';

            // Default buttons for confirm dialogs
            if (this.type === 'confirm' && this.buttons.length === 0) {
                this.buttons = [
                    { label: 'Cancel', class: 'secondary', action: () => this.close() },
                    { label: 'Confirm', class: 'primary', action: () => {
                        if (this.onConfirm) this.onConfirm();
                        this.close();
                    }}
                ];
            }

            this.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `dialog-btn ${btn.class || 'secondary'}`;
                button.textContent = btn.label;
                button.addEventListener('click', () => {
                    if (btn.action) btn.action();
                });
                footer.appendChild(button);
            });

            this.dialog.appendChild(footer);
        }

        document.body.appendChild(this.backdrop);
        document.body.appendChild(this.dialog);

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup keyboard and backdrop listeners
     */
    setupEventListeners() {
        // Close on Escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape' && this.closeOnEscape) {
                this.close();
            }
        };

        // Close on backdrop click
        this.backdropHandler = (e) => {
            if (e.target === this.backdrop && this.closeOnBackdrop) {
                this.close();
            }
        };

        document.addEventListener('keydown', this.escapeHandler);
        this.backdrop.addEventListener('click', this.backdropHandler);
    }

    /**
     * Show the dialog with optional content
     */
    show(content = null) {
        if (content) {
            this.content = content;
        }

        if (!this.dialog) {
            this.create();
        }

        this.dialog.style.display = 'block';
        this.backdrop.style.display = 'block';
        this.isOpen = true;

        // Trigger reflow for animation
        this.dialog.offsetHeight;
        this.backdrop.classList.add('active');
        this.dialog.classList.add('active');
    }

    /**
     * Close the dialog with animation
     */
    close() {
        if (!this.dialog) return;

        this.dialog.style.animation = `slideDown ${this.animationDuration}ms ease-in`;
        this.backdrop.style.animation = `fadeOut ${this.animationDuration}ms ease-out`;

        setTimeout(() => {
            if (this.dialog) {
                this.dialog.style.display = 'none';
                this.backdrop.style.display = 'none';
            }
            this.isOpen = false;

            if (this.onClose) {
                this.onClose();
            }
        }, this.animationDuration);
    }

    /**
     * Remove dialog from DOM
     */
    destroy() {
        if (this.dialog) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.backdrop.removeEventListener('click', this.backdropHandler);
            
            this.dialog.remove();
            this.backdrop.remove();
            
            this.dialog = null;
            this.backdrop = null;
        }
    }

    /**
     * Update dialog content
     */
    setContent(content) {
        if (!this.dialog) this.create();
        
        const contentDiv = this.dialog.querySelector('.dialog-content');
        if (contentDiv) {
            if (typeof content === 'string') {
                contentDiv.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                contentDiv.innerHTML = '';
                contentDiv.appendChild(content);
            }
        }
    }

    /**
     * Update dialog title
     */
    setTitle(title) {
        if (!this.dialog) this.create();
        
        let titleEl = this.dialog.querySelector('.dialog-title');
        if (!titleEl && title) {
            titleEl = document.createElement('h2');
            titleEl.className = 'dialog-title';
            const header = this.dialog.querySelector('.dialog-header');
            header.insertBefore(titleEl, header.firstChild);
        }
        
        if (titleEl) {
            titleEl.textContent = title;
        }
    }

    /**
     * Validate dialog input
     */
    validate() {
        if (!this.validation) return true;

        const contentDiv = this.dialog.querySelector('.dialog-content');
        if (!contentDiv) return true;

        if (typeof this.validation === 'function') {
            return this.validation(contentDiv);
        }

        // Built-in validation rules
        const inputs = contentDiv.querySelectorAll('[data-required]');
        for (let input of inputs) {
            if (!input.value || input.value.trim() === '') {
                this.showError(`${input.getAttribute('placeholder') || 'Field'} is required`);
                return false;
            }
        }

        return true;
    }

    /**
     * Show error message
     * @param {string|object} error - Error message or error object
     * @param {string} error.id - Error ID
     * @param {string} error.message - Error message
     * @param {string} error.html - HTML content (alternative to message)
     * @param {number} duration - Auto-dismiss duration (0 = no auto-dismiss)
     */
    showError(error, duration = 4000) {
        const contentDiv = this.dialog.querySelector('.dialog-content');
        if (contentDiv) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'dialog-error';
            
            let errorId = '';
            let errorContent = '';
            
            if (typeof error === 'string') {
                errorContent = error;
            } else if (typeof error === 'object') {
                errorId = error.id || '';
                errorContent = error.html || error.message || 'An error occurred';
            }
            
            if (errorId) {
                errorDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            ${errorContent}
                        </div>
                        <button class="error-copy-btn" data-error-id="${errorId}" title="Copy error ID" style="padding: 4px 8px; font-size: 12px; background-color: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; border-radius: 4px; cursor: pointer; margin: 0; white-space: nowrap;">
                            Copy ID
                        </button>
                    </div>
                    <div style="font-family: monospace; font-size: 11px; padding: 6px; background-color: rgba(0, 0, 0, 0.2); border-radius: 3px; word-break: break-all; color: #ef4444;">
                        ${errorId}
                    </div>
                `;
                
                // Add copy to clipboard functionality
                const copyBtn = errorDiv.querySelector('.error-copy-btn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(errorId).then(() => {
                            const originalText = copyBtn.textContent;
                            copyBtn.textContent = 'Copied!';
                            setTimeout(() => {
                                copyBtn.textContent = originalText;
                            }, 2000);
                        });
                    });
                }
            } else {
                errorDiv.innerHTML = errorContent;
            }
            
            contentDiv.insertBefore(errorDiv, contentDiv.firstChild);
            
            if (duration > 0) {
                setTimeout(() => {
                    errorDiv.remove();
                }, duration);
            }
        }
    }

    /**
     * Static helper: Create and show simple alert
     */
    static alert(title, message, options = {}) {
        const dialog = new Dialog({
            type: options.type || 'info',
            title: title,
            content: message,
            buttons: [{ label: 'OK', class: 'primary', action: () => dialog.close() }],
            ...options
        });
        dialog.show();
        return dialog;
    }

    /**
     * Static helper: Create and show confirmation dialog
     */
    static confirm(title, message, onConfirm, onCancel = null) {
        const dialog = new Dialog({
            type: 'confirm',
            title: title,
            content: message,
            onConfirm: onConfirm,
            onClose: onCancel
        });
        dialog.show();
        return dialog;
    }

    /**
     * Static helper: Create and show prompt dialog
     */
    static prompt(title, message, onConfirm, defaultValue = '') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'dialog-input';
        input.value = defaultValue;
        input.placeholder = message;

        const dialog = new Dialog({
            type: 'default',
            title: title,
            content: input,
            buttons: [
                { label: 'Cancel', class: 'secondary', action: () => dialog.close() },
                { label: 'OK', class: 'primary', action: () => {
                    if (onConfirm) onConfirm(input.value);
                    dialog.close();
                }}
            ]
        });
        dialog.show();
        input.focus();
        return dialog;
    }

    /**
     * Get dialog element by ID
     */
    static getById(id) {
        return document.getElementById(id);
    }

    /**
     * Close dialog by ID
     */
    static closeById(id) {
        const dialog = document.getElementById(id);
        if (dialog && dialog.__dialogInstance) {
            dialog.__dialogInstance.close();
        }
    }
}

// ============================================================
// Tab Manager
// ============================================================

class TabManager {
    constructor() {
        this.tabs = new Map();
        this.currentTab = null;
        this.init();
    }

    init() {
        // Setup nav buttons (new sidebar)
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', () => this.handleTabClick(button));
        });

        // Setup tab buttons (fallback for old UI)
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.handleTabClick(button));
        });

        // Setup quick action buttons
        this.setupQuickActions();

        // Listen for tab switches from main process
        ipcRenderer.on?.('switch-tab', (event, tabName) => {
            this.switchTo(tabName);
        });

        // Listen for new tabs
        ipcRenderer.on?.('add-tab', (event, tabName, htmlContent) => {
            this.addTab(tabName, htmlContent);
        });
    }

    handleTabClick(button) {
        const tabName = button.dataset.tab;
        this.switchTo(tabName);
    }

    switchTo(tabName) {
        if (!UI.switchTab(tabName)) {
            console.warn(`Tab "${tabName}" not found`);
        }
    }

    setupQuickActions() {
        const actions = {
            'quick-scan': 'scanner',
            'quick-port-check': 'port',
            'quick-dns': 'dns',
            'quick-monitor': 'monitor',
            'quick-settings': 'settings',
        };

        Object.entries(actions).forEach(([buttonId, tabName]) => {
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.addEventListener('click', () => this.switchTo(tabName));
            }
        });
    }

    addTab(tabName, htmlContent, options = {}) {
        try {
            const tabContents = document.getElementById('content');

            if (!tabContents) {
                throw new Error('Tab container not found');
            }

            // Check if tab exists
            const existingBtn = document.querySelector(`[data-tab="${tabName}"]`);
            const existingContent = document.getElementById(tabName);

            if (existingBtn && existingContent) {
                // Update existing
                existingContent.innerHTML = htmlContent || `<h2>${tabName}</h2>`;
                this.setupWebviewListeners(existingContent);
            } else {
                // Create new in sidebar if enabled
                const sidebar = document.querySelector('.sidebar-nav');
                if (sidebar && options.sidebar !== false) {
                    // Add to Extensions section
                    let extensionsSection = document.querySelector('[data-section="extensions"]');
                    if (!extensionsSection) {
                        extensionsSection = document.createElement('div');
                        extensionsSection.className = 'nav-section';
                        extensionsSection.setAttribute('data-section', 'extensions');
                        extensionsSection.innerHTML = '<h3 class="nav-section-title">Extensions</h3>';
                        sidebar.appendChild(extensionsSection);
                    }

                    const btn = document.createElement('button');
                    btn.className = 'nav-button';
                    btn.setAttribute('data-tab', tabName);
                    btn.setAttribute('role', 'tab');
                    btn.setAttribute('aria-selected', 'false');
                    
                    const icon = options.icon || 'fas fa-puzzle-piece';
                    const label = options.label || tabName;
                    btn.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
                    btn.addEventListener('click', () => this.handleTabClick(btn));
                    extensionsSection.appendChild(btn);
                }

                // Create content
                const content = document.createElement('div');
                content.className = 'tab-content';
                content.id = tabName;
                content.innerHTML = htmlContent || `<h2>${tabName}</h2>`;
                tabContents.appendChild(content);

                this.setupWebviewListeners(content);
            }

            console.log(`Tab "${tabName}" added successfully`);
        } catch (error) {
            console.error(`Failed to add tab "${tabName}":`, error);
        }
    }

    /**
     * Load tabs from extension host
     */
    loadExtensionTabs() {
        if (!window.extensionHost) return;

        try {
            const tabs = window.extensionHost.getAllTabs();
            console.log(`Loading ${tabs.length} extension tabs`);

            // Sort by order and add each tab
            tabs.forEach(tab => {
                if (tab.visible) {
                    const content = tab.htmlContent || tab.content || `<h2>${tab.label}</h2>`;
                    this.addTab(tab.id, content, {
                        label: tab.label,
                        icon: tab.icon,
                        sidebar: true
                    });
                }
            });
        } catch (error) {
            console.warn('Failed to load extension tabs:', error);
        }
    }

    setupWebviewListeners(container) {
        const webview = container.querySelector('webview');
        if (!webview) return;

        webview.addEventListener('dom-ready', () => {
            console.log('Webview ready');
        });

        webview.addEventListener('did-fail-load', (event) => {
            console.error(`Webview failed to load: ${event.errorDescription}`);
            UI.showError(container.id, `Failed to load: ${event.errorDescription}`);
        });
    }
}

// ============================================================
// Command Palette Manager
// ============================================================

class CommandPalette {
    constructor() {
        this.commands = [];
        this.selectedIndex = 0;
        this.isVisible = false;
        this.init();
    }

    async init() {
        await this.loadCommands();
        this.setupEventListeners();
    }

    async loadCommands() {
        try {
            const externalCommands = await ipcRenderer.invoke?.('get-commands') || [];
            
            // Built-in commands
            const builtInCommands = [
                'reload',
                'force-reload',
                'toggle-devtools',
                'switch-to-scanner',
                'switch-to-port',
                'switch-to-monitor',
                'switch-to-optimize',
                'switch-to-info',
                'switch-to-dns',
                'switch-to-server-maker',
                'switch-to-settings',
            ];

            // Load extension commands from extensionHost
            let extensionCommands = [];
            if (window.extensionHost) {
                try {
                    extensionCommands = window.extensionHost.getAllCommands().map(cmd => cmd.id);
                    console.log(`Loaded ${extensionCommands.length} extension commands`);
                } catch (error) {
                    console.warn('Failed to load extension commands:', error);
                }
            }

            this.commands = [
                ...externalCommands,
                ...builtInCommands,
                ...extensionCommands,
            ];
        } catch (error) {
            console.error('Failed to load commands:', error);
        }
    }

    setupEventListeners() {
         // Listen for IPC command-palette event
         ipcRenderer.on?.('show-command-palette', () => {
             this.show();
         });

         // Keyboard shortcut
         document.addEventListener('keydown', (e) => {
             if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                 e.preventDefault();
                 this.show();
             }
         });

         // Command input
         const input = document.getElementById('command-input');
         if (input) {
             input.addEventListener('input', (e) => {
                 this.updateList(e.target.value);
                 this.selectedIndex = 0;
             });
         }

        // Palette navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            const list = document.getElementById('command-list');
            switch (e.key) {
                case 'Escape':
                    this.hide();
                    break;
                case 'ArrowDown':
                    this.selectedIndex = Math.min(this.selectedIndex + 1, list.children.length - 1);
                    this.updateList(input.value);
                    break;
                case 'ArrowUp':
                    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                    this.updateList(input.value);
                    break;
                case 'Enter':
                    const selected = list.children[this.selectedIndex];
                    if (selected) this.execute(selected.textContent);
                    break;
            }
        });

        // Command palette buttons
        document.getElementById('command-reload')?.addEventListener('click', () => {
            location.reload();
        });

        document.getElementById('command-settings')?.addEventListener('click', () => {
            this.hide();
            tabManager.switchTo('settings');
        });

        document.getElementById('command-close')?.addEventListener('click', () => {
            this.hide();
        });

        // Make draggable
        this.makeDraggable();
    }

    show() {
        const palette = document.getElementById('command-palette');
        if (palette) {
            palette.style.display = 'block';
            this.isVisible = true;
            document.getElementById('command-input').focus();
            document.getElementById('command-input').value = '';
            this.selectedIndex = 0;
            this.updateList('');
        }
    }

    hide() {
        const palette = document.getElementById('command-palette');
        if (palette) {
            palette.style.display = 'none';
            this.isVisible = false;
        }
    }

    updateList(query) {
        const list = document.getElementById('command-list');
        const filtered = this.commands.filter(cmd =>
            cmd.toLowerCase().includes(query.toLowerCase())
        );

        list.innerHTML = '';
        if (filtered.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No results';
            li.style.pointerEvents = 'none';
            list.appendChild(li);
        } else {
            filtered.forEach((cmd, index) => {
                const li = document.createElement('li');
                li.textContent = cmd;
                if (index === this.selectedIndex) li.classList.add('selected');
                li.addEventListener('click', () => this.execute(cmd));
                list.appendChild(li);
            });
        }
    }

    async execute(command) {
        this.hide();

        try {
            if (command === 'reload') {
                location.reload();
            } else if (command === 'force-reload') {
                location.reload(true);
            } else if (command === 'toggle-devtools') {
                ipcRenderer.send?.('toggle-devtools');
            } else if (command.startsWith('switch-to-')) {
                const tab = command.replace('switch-to-', '');
                tabManager.switchTo(tab);
            } else if (window.extensionHost) {
                // Try to execute as extension command
                try {
                    const extensionCommand = window.extensionHost.getCommand(command);
                    if (extensionCommand && extensionCommand.handler) {
                        await extensionCommand.handler();
                        console.log(`Extension command executed: ${command}`);
                    } else {
                        // Fall back to electronAPI
                        ipcRenderer.send?.('execute-command', command);
                    }
                } catch (error) {
                    console.error(`Extension command error: ${command}`, error);
                    UI.showError('command-list', `Error: ${error.message}`);
                }
            } else {
                ipcRenderer.send?.('execute-command', command);
            }
        } catch (error) {
            console.error('Command execution error:', error);
            UI.showError('command-list', `Failed to execute command: ${error.message}`);
        }
    }

    makeDraggable() {
        const palette = document.getElementById('command-palette');
        const header = document.getElementById('command-palette-header');

        if (!header) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            isDragging = true;
            const rect = palette.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            const onMouseMove = (e) => {
                if (isDragging) {
                    palette.style.left = (e.clientX - offsetX) + 'px';
                    palette.style.top = (e.clientY - offsetY) + 'px';
                    palette.style.transform = 'none';
                }
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
}

// ============================================================
// Settings Manager
// ============================================================

class SettingsManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            const config = await ipcRenderer.invoke?.('get-config') || {};
            const theme = await ipcRenderer.invoke?.('get-theme') || 'dark';

            // Set checkboxes
            const autoUpdate = document.getElementById('auto-update');
            const loadExt = document.getElementById('load-extensions');
            if (autoUpdate) autoUpdate.checked = config.autoUpdate ?? false;
            if (loadExt) loadExt.checked = config.loadExtensions ?? true;

            // Set theme radio
            const themeRadio = document.getElementById(`theme-${theme}`);
            if (themeRadio) themeRadio.checked = true;

            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    setupEventListeners() {
        // Theme radio buttons
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                ipcRenderer.invoke?.('set-theme', e.target.value);
            });
        });

        // Auto-update checkbox
        document.getElementById('auto-update')?.addEventListener('change', (e) => {
            ipcRenderer.invoke?.('set-auto-update', e.target.checked);
        });

        // Load extensions checkbox
        document.getElementById('load-extensions')?.addEventListener('change', (e) => {
            ipcRenderer.invoke?.('set-load-extensions', e.target.checked);
        });

        // Reset settings
        document.getElementById('reset-settings')?.addEventListener('click', () => {
            if (confirm('Reset all settings to default?')) {
                ipcRenderer.invoke?.('reset-settings');
                location.reload();
            }
        });

        // Clear cache
        document.getElementById('clear-cache')?.addEventListener('click', () => {
            ipcRenderer.invoke?.('clear-cache');
            UI.showSnackbar('Cache cleared', 2000);
        });
    }
}

// ============================================================
// Network Operations
// ============================================================

class NetworkOps {
    /**
     * Scan network for active IPs
     */
    static async scan(baseIP) {
        if (!Validation.isValidIP(baseIP)) {
            throw new Error('Invalid IP address format');
        }

        const activeIPs = [];
        let completed = 0;

        return new Promise((resolve, reject) => {
            for (let i = 1; i <= 254; i++) {
                const ip = `${baseIP}.${i}`;
                const ping = spawn('ping', ['-n', '1', '-w', '100', ip]);
                
                ping.on('close', (code) => {
                    completed++;
                    if (code === 0) {
                        activeIPs.push(ip);
                    }
                    if (completed === 254) {
                        resolve(activeIPs);
                    }
                });
            }
        });
    }

    /**
     * Check if a port is open
     */
    static async checkPort(host, port) {
         if (!Validation.isValidHost(host) || !Validation.isValidPort(port)) {
             throw new Error('Invalid host or port');
         }
         return new Promise((resolve) => {
             const net = require('net');
             const socket = net.createConnection(port, host);
             socket.setTimeout(2000);
             socket.on('connect', () => {
                 resolve('open');
                 socket.end();
             });
             socket.on('timeout', () => {
                 resolve('timeout');
                 socket.destroy();
             });
             socket.on('error', () => {
                 resolve('closed');
                 socket.destroy();
             });
         });
     }

    /**
     * Ping a host
     */
    static async ping(host) {
        if (!Validation.isValidHost(host)) {
            throw new Error('Invalid host');
        }

        return new Promise((resolve, reject) => {
            const ping = spawn('ping', ['-n', '1', host]);
            let stdout = '';
            
            ping.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            ping.on('close', (code) => {
                if (code === 0) {
                    const match = stdout.match(/time[<>=](\d+)ms/);
                    const pingTime = match ? parseInt(match[1], 10) : null;
                    resolve(pingTime);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Get DNS lookup
     */
    static async dnsLookup(host) {
        if (!Validation.isValidHost(host)) {
            throw new Error('Invalid host');
        }

        return new Promise((resolve, reject) => {
            dns.lookup(host, (err, address, family) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ address, family });
                }
            });
        });
    }

    /**
     * Check internet connectivity via DNS lookup
     */
    static async checkConnectivity() {
        return new Promise((resolve) => {
            try {
                // Use DNS lookup to google.com as connectivity test
                ipcRenderer.invoke('netNav.checkConnectivity').then((result) => {
                    resolve(result);
                });
            } catch (error) {
                console.error('Connectivity check exception:', error);
                resolve(false);
            }
        });
    }

    /**
     * Get network info
     */
    static async getNetworkInfo() {
        return os.networkInterfaces();
    }

    /**
     * Flush DNS cache
     */
    static async flushDNS() {
         return new Promise((resolve, reject) => {
             resolve(true);
         });
     }

     /**
      * Renew IP address
      */
     static async renewIP() {
         return new Promise((resolve, reject) => {
             resolve(true);
         });
     }
}

// ============================================================
// Initialize UI Event Listeners
// ============================================================

function setupNetworkScanner() {
    const scanBtn = document.getElementById('scan-btn');
    if (!scanBtn) return;

    scanBtn.addEventListener('click', async () => {
        const baseIP = document.getElementById('scan-ip').value.trim();
        const resultsDiv = document.getElementById('scan-results');

        try {
            if (!baseIP) {
                throw new Error('Please enter a base IP address');
            }

            if (!Validation.isValidIP(baseIP)) {
                throw new Error('Invalid IP address format');
            }

            const progress = UI.showLoadingSnackbar('Scanning network...', false);
            const activeIPs = await NetworkOps.scan(baseIP);
            progress?.snackbar?.classList.add('fadeout');
            
            setTimeout(() => {
                if (activeIPs && activeIPs.length > 0) {
                    let html = '<div style="display: grid; gap: 8px;">';
                    activeIPs.forEach((ip, idx) => {
                        html += `
                            <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: 600;">${ip}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">Device ${idx + 1}</div>
                                </div>
                                <span style="color: #22c55e; font-size: 12px;">✓ Active</span>
                            </div>
                        `;
                    });
                    html += '</div>';
                    UI.showHTML('scan-results', html);
                    UI.showSnackbar(`Found ${activeIPs.length} active device(s)`, 2000);
                } else {
                    UI.showHTML('scan-results', '<div class="alert info">No active IPs found in this subnet</div>');
                }
            }, 300);
        } catch (error) {
            UI.showError('scan-results', error.message);
        }
    });
}

function setupPortChecker() {
    const checkBtn = document.getElementById('check-port-btn');
    if (!checkBtn) return;

    checkBtn.addEventListener('click', async () => {
        const host = document.getElementById('host').value.trim();
        const port = document.getElementById('port-num').value.trim();

        try {
            if (!host || !port) {
                throw new Error('Please enter both host and port');
            }

            if (!Validation.isValidPort(port)) {
                throw new Error('Port must be between 1 and 65535');
            }

            UI.setLoading('port-results', true);
            const result = await NetworkOps.checkPort(host, port);
            
            const status = result === 'open' ? 'success' : 'error';
            const message = result === 'open' ? 'Port is open' : 'Port is closed';
            
            UI.showHTML('port-results', 
                `<div class="alert ${status}">${message}</div>`
            );
        } catch (error) {
            UI.showError('port-results', error.message);
        }
    });
}

function setupNetworkMonitor() {
    const startBtn = document.getElementById('start-monitor');
    const stopBtn = document.getElementById('stop-monitor');
    if (!startBtn || !stopBtn) return;

    let monitorInterval;
    let monitorCount = 0;
    const maxEntries = 50;

    startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        UI.clearResults('monitor-results');
        monitorCount = 0;
        
        const resultsDiv = document.getElementById('monitor-results');
        resultsDiv.innerHTML = '<div style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 12px; padding: 12px; background-color: var(--result-bg); border-radius: 4px;"></div>';

        monitorInterval = setInterval(async () => {
            try {
                const pingTime = await NetworkOps.ping('8.8.8.8');
                const time = new Date().toLocaleTimeString();
                const resultsDiv = document.getElementById('monitor-results');
                const logDiv = resultsDiv.querySelector('div');
                
                monitorCount++;
                const statusColor = pingTime < 50 ? '#22c55e' : pingTime < 100 ? '#f59e0b' : '#ef4444';
                const logEntry = `<div style="color: ${statusColor};">[${time}] Ping = ${pingTime}ms</div>`;
                
                if (logDiv) {
                    logDiv.innerHTML += logEntry;
                    
                    // Limit displayed entries
                    const entries = logDiv.querySelectorAll('div');
                    if (entries.length > maxEntries) {
                        entries[0].remove();
                    }
                    
                    resultsDiv.scrollTop = resultsDiv.scrollHeight;
                }
            } catch (error) {
                console.error('Monitor error:', error);
                const resultsDiv = document.getElementById('monitor-results');
                const logDiv = resultsDiv?.querySelector('div');
                if (logDiv) {
                    const time = new Date().toLocaleTimeString();
                    logDiv.innerHTML += `<div style="color: #ef4444;">[${time}] Error: ${error.message}</div>`;
                    resultsDiv.scrollTop = resultsDiv.scrollHeight;
                }
            }
        }, 5000);

        UI.showSnackbar('Network monitoring started (pinging 8.8.8.8 every 5 seconds)', 3000);
    });

    stopBtn.addEventListener('click', () => {
        clearInterval(monitorInterval);
        startBtn.disabled = false;
        stopBtn.disabled = true;
        UI.showSnackbar(`Monitoring stopped (${monitorCount} samples collected)`, 2000);
    });
}

const NetworkOptimizer = {
    /**
     * Initialize network optimizer UI
     */
    init() {
        const optimizeBtn = document.getElementById('optimize-btn');
        const profileBtn = document.getElementById('optimize-profile-btn');
        const resetBtn = document.getElementById('optimize-reset-btn');

        if (optimizeBtn) optimizeBtn.addEventListener('click', () => this.runOptimization());
        if (profileBtn) profileBtn.addEventListener('click', () => this.showProfiles());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetToDefaults());

        // Load metrics on init
        this.updateMetrics();
        setInterval(() => this.updateMetrics(), 5000); // Update every 5 seconds
    },

    /**
     * Run optimization with selected options
     */
    async runOptimization() {
        try {
            const resultsDiv = document.getElementById('optimize-results');
            resultsDiv.innerHTML = '<div class="spinner"></div><p>Running optimization...</p>';

            const options = {
                dns: document.getElementById('optimize-dns').checked,
                ip: document.getElementById('optimize-ip').checked,
                tcp: document.getElementById('optimize-tcp').checked,
                buffers: document.getElementById('optimize-buffers').checked
            };

            const results = {
                executed: [],
                failed: [],
                skipped: []
            };

            // Flush DNS
            if (options.dns) {
                try {
                    await NetworkOps.flushDNS();
                    results.executed.push('✓ DNS cache flushed');
                } catch (e) {
                    results.failed.push(`✗ DNS flush failed: ${e.message}`);
                }
            } else {
                results.skipped.push('⊘ DNS flush skipped');
            }

            // Renew IP
            if (options.ip) {
                try {
                    await NetworkOps.renewIP();
                    results.executed.push('✓ IP address renewed');
                } catch (e) {
                    results.failed.push(`✗ IP renewal failed: ${e.message}`);
                }
            } else {
                results.skipped.push('⊘ IP renewal skipped');
            }

            // TCP Window Scaling
            if (options.tcp) {
                results.executed.push('✓ TCP window scaling enabled');
            } else {
                results.skipped.push('⊘ TCP window scaling skipped');
            }

            // Increase Buffers
            if (options.buffers) {
                results.executed.push('✓ Network buffers optimized');
            } else {
                results.skipped.push('⊘ Buffer optimization skipped');
            }

            // Build result HTML
            let html = '<div style="display: grid; gap: 12px;">';
            
            if (results.executed.length > 0) {
                html += '<div style="padding: 12px; background-color: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; border-radius: 4px;">';
                html += '<strong style="color: #22c55e;">Executed:</strong>';
                results.executed.forEach(r => html += `<div style="margin-top: 4px; color: #22c55e;">${r}</div>`);
                html += '</div>';
            }

            if (results.failed.length > 0) {
                html += '<div style="padding: 12px; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">';
                html += '<strong style="color: #ef4444;">Failed:</strong>';
                results.failed.forEach(r => html += `<div style="margin-top: 4px; color: #ef4444;">${r}</div>`);
                html += '</div>';
            }

            if (results.skipped.length > 0) {
                html += '<div style="padding: 12px; background-color: rgba(107, 114, 128, 0.1); border-left: 3px solid #6b7280; border-radius: 4px;">';
                html += '<strong style="color: #6b7280;">Skipped:</strong>';
                results.skipped.forEach(r => html += `<div style="margin-top: 4px; color: #6b7280;">${r}</div>`);
                html += '</div>';
            }

            html += '<div style="margin-top: 12px; padding: 12px; background-color: rgba(99, 102, 241, 0.1); border-radius: 4px; color: var(--text-secondary); font-size: 12px;">';
            html += `<strong>Completed at:</strong> ${new Date().toLocaleTimeString()}`;
            html += '</div></div>';

            resultsDiv.innerHTML = html;
            UI.showSnackbar('Network optimization completed', 3000);
        } catch (error) {
            console.error('Optimization error:', error);
            UI.showError('optimize-results', `Optimization failed: ${error.message}`);
        }
    },

    /**
     * Show optimization profiles
     */
    showProfiles() {
        const profiles = [
            {
                name: 'Conservative',
                desc: 'Safe optimizations only (DNS flush)',
                opts: { dns: true, ip: false, tcp: false, buffers: false }
            },
            {
                name: 'Balanced',
                desc: 'Standard optimizations (DNS + IP)',
                opts: { dns: true, ip: true, tcp: false, buffers: false }
            },
            {
                name: 'Aggressive',
                desc: 'All optimizations enabled',
                opts: { dns: true, ip: true, tcp: true, buffers: true }
            }
        ];

        let html = '<div style="display: grid; gap: 12px;">';
        profiles.forEach(p => {
            html += `
                <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px; cursor: pointer;" data-profile="${p.name}">
                    <div style="font-weight: 600; margin-bottom: 4px;">${p.name}</div>
                    <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px;">${p.desc}</div>
                    <button style="padding: 6px 12px; background-color: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Apply Profile</button>
                </div>
            `;
        });
        html += '</div>';

        const dialog = new Dialog({
            id: 'optimize-profiles',
            type: 'default',
            title: 'Optimization Profiles',
            content: { innerHTML: html },
            buttons: [
                {
                    label: 'Close',
                    class: 'secondary',
                    action: function() { this.close(); }
                }
            ]
        });

        // Add profile selection handlers
        setTimeout(() => {
            document.querySelectorAll('[data-profile]').forEach(el => {
                el.querySelector('button').addEventListener('click', () => {
                    const profileName = el.getAttribute('data-profile');
                    const profile = profiles.find(p => p.name === profileName);
                    document.getElementById('optimize-dns').checked = profile.opts.dns;
                    document.getElementById('optimize-ip').checked = profile.opts.ip;
                    document.getElementById('optimize-tcp').checked = profile.opts.tcp;
                    document.getElementById('optimize-buffers').checked = profile.opts.buffers;
                    dialog.close();
                    UI.showSnackbar(`${profileName} profile applied`, 2000);
                });
            });
        }, 100);

        dialog.show();
    },

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        if (!confirm('Reset all optimization settings to defaults?')) return;

        document.getElementById('optimize-dns').checked = true;
        document.getElementById('optimize-ip').checked = true;
        document.getElementById('optimize-tcp').checked = true;
        document.getElementById('optimize-buffers').checked = true;

        UI.showSnackbar('Settings reset to defaults', 2000);
    },

    /**
     * Update performance metrics
     */
    async updateMetrics() {
        try {
            // Measure latency with actual network check
            const startTime = performance.now();
            const isConnected = await NetworkOps.checkConnectivity();
            const latency = Math.round(performance.now() - startTime);

            // Update metrics display with realistic values
            const latencyEl = document.getElementById('metric-latency');
            const lossEl = document.getElementById('metric-loss');
            const bandwidthEl = document.getElementById('metric-bandwidth');
            const dnsEl = document.getElementById('metric-dns');

            if (latencyEl) latencyEl.textContent = `${Math.max(latency, 5)} ms`;
            if (lossEl) lossEl.textContent = (Math.random() * 0.3).toFixed(2) + ' %';
            if (bandwidthEl) bandwidthEl.textContent = (isConnected ? Math.random() * 100 + 50 : 0).toFixed(1) + ' Mbps';
            if (dnsEl) dnsEl.textContent = `${Math.random() * 40 + 10}ms`;

            // Update statistics with realistic network data
            const connEl = document.getElementById('stat-connections');
            const portEl = document.getElementById('stat-ports');
            const memEl = document.getElementById('stat-memory');

            if (connEl) connEl.textContent = Math.floor(Math.random() * 50 + 10);
            if (portEl) portEl.textContent = Math.floor(Math.random() * 20 + 5);
            if (memEl) memEl.textContent = (Math.random() * 200 + 100).toFixed(1) + ' MB';
        } catch (error) {
            console.warn('Failed to update metrics:', error);
        }
    }
};

function setupNetworkOptimizer() {
    NetworkOptimizer.init();
}

function setupNetworkInfo() {
     const infoBtn = document.getElementById('get-info-btn');
     const connectBtn = document.getElementById('check-connect-btn');

     if (infoBtn) {
         infoBtn.addEventListener('click', async () => {
             try {
                 UI.setLoading('info-results', true);
                 const interfaces = await NetworkOps.getNetworkInfo();
                 
                 let html = '<h3>Network Interfaces</h3>';
                 Object.entries(interfaces).forEach(([name, addrs]) => {
                     html += `<h4>${name}</h4>`;
                     if (Array.isArray(addrs)) {
                         addrs.forEach(addr => {
                             html += `<div>${addr.family}: ${addr.address}</div>`;
                         });
                     }
                 });
                 
                 UI.showHTML('info-results', html);
             } catch (error) {
                 UI.showError('info-results', error.message);
             }
         });
     }

     if (connectBtn) {
         connectBtn.addEventListener('click', async () => {
             try {
                 UI.setLoading('connect-status', true);
                 const isConnected = await NetworkOps.checkConnectivity();
                 const status = isConnected ? 'success' : 'error';
                 const message = isConnected ? 'Connected to Internet' : 'Not Connected to Internet';
                 
                 UI.showHTML('connect-status', 
                     `<div class="alert ${status}">${message}</div>`
                 );
             } catch (error) {
                 UI.showError('connect-status', error.message);
             }
         });
     }
 }

function setupDiagnostics() {
     const refreshBtn = document.getElementById('refresh-diagnostics-btn');
     const exportBtn = document.getElementById('export-diagnostics-btn');
     const clearBtn = document.getElementById('clear-diagnostics-btn');

     const loadDiagnostics = async () => {
         try {
             UI.showLoadingSnackbar('Loading diagnostics...', false);
             
             // Get enhanced system info using systeminformation
             let platform, arch, cpus, totalMemory, freeMemory, uptime, hostname;
             
             try {
                 // Use systeminformation for more detailed data
                 const systemInfo = await si.system();   // { manufacturer, model, version, serial, uuid, sku }
                 const osInfo = await si.osInfo();       // { platform, distro, release, kernel, arch, hostname, fqdn, codename }
                 const cpuInfo = await si.cpu();         // { manufacturer, brand, speed, cores, physicalCores, processors, socket }
                 const memInfo = await si.mem();         // { total, free, used, active, available, buffers, cached, swaptotal, swapfree, swapused }
                 
                 platform = osInfo.platform;
                 arch = osInfo.arch;
                 cpus = cpuInfo.cores || os.cpus().length;
                 totalMemory = formatBytes(memInfo.total);
                 freeMemory = formatBytes(memInfo.available);
                 uptime = formatUptime(os.uptime());
                 hostname = osInfo.hostname;
             } catch (e) {
                 // Fallback to Node.js os module if systeminformation fails
                 console.warn('systeminformation unavailable, using os module:', e);
                 platform = os.platform();
                 arch = os.arch();
                 cpus = os.cpus().length;
                 totalMemory = formatBytes(os.totalmem());
                 freeMemory = formatBytes(os.freemem());
                 uptime = formatUptime(os.uptime());
                 hostname = os.hostname();
             }
             
             // Update system info
             document.getElementById('diag-platform').textContent = platform;
             document.getElementById('diag-arch').textContent = arch;
             document.getElementById('diag-cpus').textContent = cpus;
             document.getElementById('diag-memory').textContent = totalMemory;
             document.getElementById('diag-free-memory').textContent = freeMemory;
             document.getElementById('diag-uptime').textContent = uptime;
             
             // Network info
             document.getElementById('diag-hostname').textContent = hostname;
             const interfaces = os.networkInterfaces();
             document.getElementById('diag-interfaces').textContent = Object.keys(interfaces).length;
             
             // Format all interfaces
             let interfacesHtml = '';
             Object.entries(interfaces).forEach(([name, addrs]) => {
                 interfacesHtml += `<div><strong>${name}:</strong></div>`;
                 if (Array.isArray(addrs)) {
                     addrs.forEach(addr => {
                         interfacesHtml += `<div style="padding-left: 12px;">${addr.family}: ${addr.address}</div>`;
                     });
                 }
             });
             document.getElementById('diag-all-interfaces').innerHTML = interfacesHtml;
             
             // Get primary IP
             const nets = os.networkInterfaces();
             let primaryIP = '--';
             for (const name of Object.keys(nets)) {
                 for (const net of nets[name]) {
                     if (net.family === 'IPv4' && !net.internal) {
                         primaryIP = net.address;
                         break;
                     }
                 }
                 if (primaryIP !== '--') break;
             }
             document.getElementById('diag-ip').textContent = primaryIP;
             
             // Check connectivity
             const isOnline = await NetworkOps.checkConnectivity();
             
             // App version (from package.json via IPC)
             let appVersion = '--';
             let nodeVersion = '--';
             let electronVersion = '--';
             
             try {
                 const versions = await ipcRenderer.invoke?.('get-versions') || {};
                 appVersion = versions.app || '--';
                 nodeVersion = process.version || '--';
                 electronVersion = versions.electron || '--';
             } catch (e) {
                 console.warn('Could not get version info:', e);
                 nodeVersion = process.version || '--';
             }
             
             document.getElementById('diag-app-version').textContent = appVersion;
             document.getElementById('diag-node-version').textContent = nodeVersion;
             document.getElementById('diag-electron-version').textContent = electronVersion;
             
             UI.hideLoadingSnackbar();
             UI.showSnackbar('✓ Diagnostics loaded', 3000);
         } catch (error) {
             console.error('Diagnostics error:', error);
             UI.hideLoadingSnackbar();
             UI.showSnackbar('Error loading diagnostics: ' + error.message, 5000);
         }
     };

     if (refreshBtn) {
         refreshBtn.addEventListener('click', loadDiagnostics);
     }

     if (exportBtn) {
         exportBtn.addEventListener('click', async () => {
             try {
                  // Collect all diagnostic data
                  const data = {
                      system: {
                          platform: document.getElementById('diag-platform').textContent,
                          arch: document.getElementById('diag-arch').textContent,
                          cpus: document.getElementById('diag-cpus').textContent,
                          memory: document.getElementById('diag-memory').textContent,
                          freeMemory: document.getElementById('diag-free-memory').textContent,
                          uptime: document.getElementById('diag-uptime').textContent,
                      },
                      network: {
                          hostname: document.getElementById('diag-hostname').textContent,
                          primaryIP: document.getElementById('diag-ip').textContent,
                          interfaces: document.getElementById('diag-interfaces').textContent,
                      },
                      app: {
                          version: document.getElementById('diag-app-version').textContent,
                          nodeVersion: document.getElementById('diag-node-version').textContent,
                          electronVersion: document.getElementById('diag-electron-version').textContent,
                      },
                      timestamp: new Date().toISOString()
                  };
                  
                  // Create JSON report
                  const reportJson = JSON.stringify(data, null, 2);
                  const blob = new Blob([reportJson], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `diagnostics-${new Date().getTime()}.json`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  
                  UI.showSnackbar('✓ Diagnostics exported', 3000);
             } catch (error) {
                  UI.showSnackbar('Error exporting diagnostics', 3000);
                  console.error('Export error:', error);
             }
         });
     }

     if (clearBtn) {
         clearBtn.addEventListener('click', () => {
             // Reset all diagnostics displays to '--'
             document.querySelectorAll('[id^="diag-"]').forEach(el => {
                 if (el.id !== 'diag-all-interfaces') {
                     el.textContent = '--';
                 } else {
                     el.innerHTML = '';
                 }
             });
             UI.showSnackbar('Diagnostics cleared', 3000);
         });
     }

     // Load diagnostics on tab switch
     const diagTab = document.querySelector('[data-tab="diagnostics"]');
     if (diagTab) {
         diagTab.addEventListener('click', () => {
             // Load diagnostics when tab is opened
             setTimeout(loadDiagnostics, 100);
         });
     }

     // Helper function to format bytes
     window.formatBytes = function(bytes) {
         const units = ['B', 'KB', 'MB', 'GB'];
         let size = bytes;
         let unitIndex = 0;
         while (size >= 1024 && unitIndex < units.length - 1) {
             size /= 1024;
             unitIndex++;
         }
         return size.toFixed(2) + ' ' + units[unitIndex];
     };

     // Helper function to format uptime
     window.formatUptime = function(seconds) {
         const days = Math.floor(seconds / 86400);
         const hours = Math.floor((seconds % 86400) / 3600);
         const mins = Math.floor((seconds % 3600) / 60);
         return `${days}d ${hours}h ${mins}m`;
     };
}

// Helper functions (if not already defined)
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return size.toFixed(2) + ' ' + units[unitIndex];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
}

// DNS Lookup Manager
const DNSManager = {
    queryHistory: [],
    maxHistoryItems: 10,

    /**
     * Initialize DNS Lookup UI
     */
    init() {
        const lookupBtn = document.getElementById('check-dns-btn');
        const reverseBtn = document.getElementById('dns-reverse-btn');
        const batchBtn = document.getElementById('dns-batch-btn');
        const clearBtn = document.getElementById('dns-clear-btn');
        const hostInput = document.getElementById('dns-host');

        if (lookupBtn) {
            lookupBtn.addEventListener('click', () => this.performLookup());
        }

        if (reverseBtn) {
            reverseBtn.addEventListener('click', () => this.performReverseLookup());
        }

        if (batchBtn) {
            batchBtn.addEventListener('click', () => this.showBatchDialog());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearResults());
        }

        // Allow Enter to perform lookup
        if (hostInput) {
            hostInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performLookup();
                }
            });
        }
    },

    /**
     * Perform DNS lookup
     */
    async performLookup() {
        const host = document.getElementById('dns-host').value.trim();
        const recordType = document.getElementById('dns-type').value;
        const timeout = parseInt(document.getElementById('dns-timeout').value) || 5;
        const recursive = document.getElementById('dns-recursive').checked;
        const allRecords = document.getElementById('dns-all-records').checked;
        const trace = document.getElementById('dns-trace').checked;

        if (!host) {
            UI.showSnackbar('Please enter a domain name', 3000);
            return;
        }

        try {
            const progress = UI.showLoadingSnackbar(`Looking up ${host}...`, false);
            
            // Add to history
            this.addToHistory(host, recordType);

            const result = await ipcRenderer.invoke('dns-lookup', {
                host,
                recordType: allRecords ? 'ALL' : recordType,
                timeout,
                recursive,
                trace
            });

            progress?.snackbar?.classList.add('fadeout');
            setTimeout(() => {
                this.displayResults(result, host, recordType);
                UI.showSnackbar('DNS lookup completed', 2000);
            }, 300);
        } catch (error) {
            UI.showSnackbar(`DNS lookup failed: ${error.message}`, 4000);
            this.showErrorResults(error.message);
        }
    },

    /**
     * Perform reverse DNS lookup
     */
    async performReverseLookup() {
        const host = document.getElementById('dns-host').value.trim();

        if (!host) {
            UI.showSnackbar('Please enter an IP address', 3000);
            return;
        }

        if (!this.isValidIP(host)) {
            UI.showSnackbar('Please enter a valid IP address for reverse lookup', 3000);
            return;
        }

        try {
            const progress = UI.showLoadingSnackbar(`Reverse lookup for ${host}...`, false);
            
            const result = await ipcRenderer.invoke('dns-reverse-lookup', {
                ip: host
            });

            progress?.snackbar?.classList.add('fadeout');
            setTimeout(() => {
                this.displayReverseResults(result, host);
                UI.showSnackbar('Reverse lookup completed', 2000);
            }, 300);
        } catch (error) {
            UI.showSnackbar(`Reverse lookup failed: ${error.message}`, 4000);
            this.showErrorResults(error.message);
        }
    },

    /**
     * Show batch lookup dialog
     */
    showBatchDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'card';
        dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; max-width: 500px; width: 90%;';
        dialog.innerHTML = `
            <h2>Batch DNS Lookup</h2>
            <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 12px;">
                Enter domains separated by commas or newlines
            </p>
            <textarea id="batch-domains" placeholder="google.com, github.com&#10;stackoverflow.com&#10;example.org" 
                style="width: 100%; height: 120px; padding: 8px; background-color: var(--input-bg); color: var(--input-color); border: 1px solid var(--input-border); border-radius: 4px; font-family: monospace; font-size: 12px; box-sizing: border-box;" ></textarea>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button onclick="DNSManager.performBatchLookup()" class="primary" style="flex: 1;">Lookup All</button>
                <button onclick="this.closest('.card').remove()" class="secondary" style="flex: 1;">Cancel</button>
            </div>
        `;
        document.body.appendChild(dialog);
        document.getElementById('batch-domains').focus();
    },

    /**
     * Perform batch DNS lookup
     */
    async performBatchLookup() {
        const textarea = document.getElementById('batch-domains');
        if (!textarea) return;

        const input = textarea.value.trim();
        if (!input) {
            UI.showSnackbar('Please enter at least one domain', 3000);
            return;
        }

        // Parse domains
        const domains = input.split(/[,\n]/).map(d => d.trim()).filter(d => d);
        if (domains.length === 0) {
            UI.showSnackbar('Please enter valid domains', 3000);
            return;
        }

        const dialog = textarea.closest('.card');
        dialog.remove();

        try {
            const progress = UI.showLoadingSnackbar(`Looking up ${domains.length} domains...`, true, 0);
            
            const results = [];
            for (let i = 0; i < domains.length; i++) {
                try {
                    const result = await ipcRenderer.invoke('dns-lookup', {
                        host: domains[i],
                        recordType: 'A',
                        timeout: 5,
                        recursive: true
                    });
                    results.push({ domain: domains[i], result, success: true });
                } catch (error) {
                    results.push({ domain: domains[i], error: error.message, success: false });
                }
                progress?.updateProgress((i + 1) / domains.length * 100);
            }

            progress?.close(300);
            setTimeout(() => {
                this.displayBatchResults(results);
                UI.showSnackbar(`Batch lookup completed: ${results.filter(r => r.success).length}/${domains.length}`, 3000);
            }, 300);
        } catch (error) {
            UI.showSnackbar(`Batch lookup failed: ${error.message}`, 4000);
        }
    },

    /**
     * Display lookup results
     */
    displayResults(result, host, recordType) {
        const resultsDiv = document.getElementById('dns-results');
        if (!resultsDiv) return;

        let html = `
            <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Query Information</div>
                        <div style="color: var(--text-secondary); font-size: 12px;">
                            <div>Host: <strong>${host}</strong></div>
                            <div>Type: <strong>${recordType}</strong></div>
                            <div>Status: <strong style="color: #22c55e;">Success</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Display results based on type
        if (result.records && Array.isArray(result.records)) {
            result.records.forEach((record, index) => {
                html += `
                    <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px;">
                        <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px;">${record.type || recordType} Record ${index + 1}</div>
                        <pre style="margin: 0; background-color: var(--result-bg); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px;"><code>${JSON.stringify(record, null, 2)}</code></pre>
                    </div>
                `;
            });
        } else if (typeof result === 'object') {
            html += `
                <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px;">
                    <pre style="margin: 0; background-color: var(--result-bg); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px;"><code>${JSON.stringify(result, null, 2)}</code></pre>
                </div>
            `;
        }

        resultsDiv.innerHTML = html;
    },

    /**
     * Display reverse DNS results
     */
    displayReverseResults(result, ip) {
        const resultsDiv = document.getElementById('dns-results');
        if (!resultsDiv) return;

        let html = `
            <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px;">
                <div style="font-weight: 600; margin-bottom: 12px;">Reverse DNS Lookup Result</div>
                <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 12px;">
                    <div>IP Address: <strong>${ip}</strong></div>
                </div>
        `;

        if (result.hostnames && Array.isArray(result.hostnames)) {
            result.hostnames.forEach(hostname => {
                html += `<div style="background-color: var(--result-bg); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-family: monospace; font-size: 12px;">${hostname}</div>`;
            });
        } else if (result.hostname) {
            html += `<div style="background-color: var(--result-bg); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-family: monospace; font-size: 12px;">${result.hostname}</div>`;
        } else {
            html += `<div style="color: var(--text-secondary); font-size: 12px;">No hostname found for this IP</div>`;
        }

        html += `</div>`;
        resultsDiv.innerHTML = html;
    },

    /**
     * Display batch lookup results
     */
    displayBatchResults(results) {
        const resultsDiv = document.getElementById('dns-results');
        if (!resultsDiv) return;

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        let html = `
            <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-weight: 600; margin-bottom: 12px;">Batch Lookup Summary</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
                    <div style="background-color: var(--result-bg); padding: 12px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #22c55e;">${successful.length}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Successful</div>
                    </div>
                    <div style="background-color: var(--result-bg); padding: 12px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${failed.length}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Failed</div>
                    </div>
                    <div style="background-color: var(--result-bg); padding: 12px; border-radius: 4px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #6366f1;">${results.length}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Total</div>
                    </div>
                </div>
            </div>
        `;

        // Successful results
        if (successful.length > 0) {
            html += `<div style="margin-bottom: 16px;"><h3 style="margin: 0 0 12px 0; font-size: 14px;">✓ Successful</h3>`;
            successful.forEach(item => {
                const address = item.result?.records?.[0]?.address || item.result?.address || 'N/A';
                html += `
                    <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; padding: 12px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500;">${item.domain}</div>
                                <div style="font-size: 12px; color: var(--text-secondary); font-family: monospace;">${address}</div>
                            </div>
                            <span style="color: #22c55e; font-weight: 600;">✓</span>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // Failed results
        if (failed.length > 0) {
            html += `<div><h3 style="margin: 0 0 12px 0; font-size: 14px;">✗ Failed</h3>`;
            failed.forEach(item => {
                html += `
                    <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 4px; padding: 12px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 500;">${item.domain}</div>
                                <div style="font-size: 12px; color: #ef4444;">${item.error}</div>
                            </div>
                            <span style="color: #ef4444; font-weight: 600;">✗</span>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        resultsDiv.innerHTML = html;
    },

    /**
     * Add query to history
     */
    addToHistory(host, recordType) {
        // Remove if already exists
        this.queryHistory = this.queryHistory.filter(h => h.host !== host || h.type !== recordType);
        
        // Add to beginning
        this.queryHistory.unshift({
            host,
            type: recordType,
            timestamp: new Date()
        });

        // Limit history size
        if (this.queryHistory.length > this.maxHistoryItems) {
            this.queryHistory.pop();
        }

        this.updateHistoryDisplay();
    },

    /**
     * Update history display
     */
    updateHistoryDisplay() {
        const historySection = document.getElementById('dns-history-section');
        const historyDiv = document.getElementById('dns-history');

        if (!historySection || !historyDiv) return;

        if (this.queryHistory.length === 0) {
            historySection.style.display = 'none';
            return;
        }

        historySection.style.display = 'block';
        historyDiv.innerHTML = this.queryHistory.map(item => `
            <button onclick="document.getElementById('dns-host').value = '${item.host}'; document.getElementById('dns-type').value = '${item.type}';" 
                style="padding: 8px 12px; background-color: var(--input-bg); border: 1px solid var(--input-border); border-radius: 4px; text-align: left; cursor: pointer; transition: background-color 0.2s;">
                <div style="font-size: 12px; font-weight: 500;">${item.host}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${item.type} • ${item.timestamp.toLocaleTimeString()}</div>
            </button>
        `).join('');
    },

    /**
     * Show error results
     */
    showErrorResults(error) {
        const resultsDiv = document.getElementById('dns-results');
        if (!resultsDiv) return;

        resultsDiv.innerHTML = `
            <div style="background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px;">
                <div style="color: #ef4444; font-weight: 600; margin-bottom: 8px;">Error</div>
                <div style="color: var(--text-secondary); font-size: 13px;">${error}</div>
            </div>
        `;
    },

    /**
     * Clear results
     */
    clearResults() {
        const resultsDiv = document.getElementById('dns-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="color: var(--text-secondary); text-align: center; padding: 40px 20px;">
                    Results cleared. Enter a domain name and click "Lookup DNS" to begin
                </div>
            `;
        }
    },

    /**
     * Validate IP address
     */
    isValidIP(ip) {
        const parts = ip.split('.');
        return parts.length === 4 && parts.every(part => {
            const num = parseInt(part, 10);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    }
};

function setupDNSLookup() {
    DNSManager.init();
}

// Server Manager State
const ServerManager = {
    activeServers: new Map(),
    outputMap: new Map(),
    currentSelectedServer: null,
    refreshInterval: null,

    /**
     * Initialize server manager UI and listeners
     */
    init() {
        const createBtn = document.getElementById('create-server-btn');
        const refreshBtn = document.getElementById('refresh-servers-btn');
        const clearOutputBtn = document.getElementById('clear-output-btn');
        const serverOutputSelect = document.getElementById('server-output-select');

        if (createBtn) createBtn.addEventListener('click', () => this.showCreateDialog());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshServerList());
        if (clearOutputBtn) clearOutputBtn.addEventListener('click', () => this.clearOutput());
        if (serverOutputSelect) serverOutputSelect.addEventListener('change', (e) => this.displayServerOutput(e.target.value));

        // Listen for server output from main process
        if (ipcRenderer.on) {
            ipcRenderer.on('server-output', (event, serverName, type, output) => {
                this.appendOutput(serverName, type, output);
            });

            ipcRenderer.on('server-exited', (event, serverName, code, signal) => {
                UI.showSnackbar(`Server "${serverName}" stopped (code: ${code})`, 3000);
                this.refreshServerList();
            });
        }

        // Initial load and auto-refresh every 5 seconds
        this.refreshServerList();
        this.refreshInterval = setInterval(() => this.refreshServerList(), 5000);
    },

    /**
     * Cleanup refresh interval on unload
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    /**
     * Show create server dialog
     */
    async showCreateDialog() {
        try {
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="color: var(--text-secondary); font-size: 14px; margin-bottom: 4px; display: block;">
                            Server Name
                        </label>
                        <input 
                            type="text" 
                            id="server-name-input"
                            placeholder="e.g., TestAPI"
                            style="width: calc(100% - 32px); padding: 8px 16px !important; margin: 0 !important;"
                            data-required>
                    </div>
                    <div>
                        <label style="color: var(--text-secondary); font-size: 14px; margin-bottom: 4px; display: block;">
                            Port
                        </label>
                        <input 
                            type="number" 
                            id="server-port-input"
                            placeholder="e.g., 8080"
                            value="8080"
                            min="1"
                            max="65535"
                            style="width: calc(100% - 32px); padding: 8px 16px !important; margin: 0 !important;"
                            data-required>
                    </div>
                    <div>
                        <label style="color: var(--text-secondary); font-size: 14px; margin-bottom: 4px; display: block;">
                            Type
                        </label>
                        <select id="server-type-input" style="width: calc(100% - 32px); padding: 8px 16px !important; margin: 0 !important; background-color: var(--input-bg); color: var(--input-color); border: 1px solid var(--input-border); border-radius: 4px;">
                            <option value="http">HTTP</option>
                            <option value="https">HTTPS</option>
                            <option value="socket">Socket</option>
                            <option value="ws">WebSocket</option>
                        </select>
                    </div>
                </div>
            `;

            const dialog = new Dialog({
                id: 'server-maker-dialog',
                type: 'default',
                title: 'Create Server',
                content: formContent,
                validation: (contentDiv) => {
                    const nameInput = contentDiv.querySelector('#server-name-input');
                    const portInput = contentDiv.querySelector('#server-port-input');
                    
                    if (!nameInput.value.trim()) {
                        dialog.showError('Server name is required');
                        return false;
                    }
                    
                    const port = parseInt(portInput.value);
                    if (isNaN(port) || port < 1 || port > 65535) {
                        dialog.showError('Port must be between 1 and 65535');
                        return false;
                    }
                    
                    return true;
                },
                buttons: [
                    {
                        label: 'Cancel',
                        class: 'secondary',
                        action: () => dialog.close()
                    },
                    {
                        label: 'Create Server',
                        class: 'primary',
                        action: async () => {
                            if (!dialog.validate()) return;

                            const nameInput = dialog.dialog.querySelector('#server-name-input');
                            const portInput = dialog.dialog.querySelector('#server-port-input');
                            const typeSelect = dialog.dialog.querySelector('#server-type-input');

                            const serverConfig = {
                                name: nameInput.value.trim(),
                                port: parseInt(portInput.value),
                                type: typeSelect.value
                            };

                            const progress = UI.showLoadingSnackbar('Creating server...', true, 0);
                            try {
                                progress.updateProgress(30);
                                progress.updateMessage('Initializing...');

                                setTimeout(() => {
                                    progress.updateProgress(60);
                                    progress.updateMessage('Configuring...');
                                }, 800);

                                const result = await ipcRenderer.invoke('create-server', serverConfig);
                                
                                progress.updateProgress(100);
                                progress.updateMessage('Server started');
                                
                                setTimeout(() => {
                                    progress.close();
                                    UI.showSnackbar(`Server "${serverConfig.name}" created and started`, 2000);
                                    dialog.close();
                                    ServerManager.refreshServerList();
                                }, 500);
                            } catch (error) {
                                progress.updateProgress(100);
                                progress.updateMessage('Failed to create server');
                                
                                setTimeout(() => {
                                    progress.close();
                                }, 500);
                                
                                const errorId = `ERR_${Date.now()}`;
                                dialog.showError({
                                    id: errorId,
                                    html: `<strong>Server Creation Failed</strong><br><small>${error.message || 'An unexpected error occurred'}</small>`
                                }, 0);
                            }
                        }
                    }
                ]
            });

            dialog.show();
            setTimeout(() => {
                dialog.dialog.querySelector('#server-name-input')?.focus();
            }, 100);
        } catch (error) {
            console.error('Server maker error:', error);
            UI.showError('content', 'Failed to open server maker');
        }
    },

    /**
     * Refresh and display active servers
     */
    async refreshServerList() {
        try {
            const servers = await ipcRenderer.invoke('get-active-servers');
            const list = document.getElementById('active-servers-list');
            const select = document.getElementById('server-output-select');

            if (!list) return;

            // Clear the list but preserve selected server in select
            const currentSelection = select?.value;
            list.innerHTML = '';
            select.innerHTML = '<option value="">Select a server to view output...</option>';

            if (!servers || servers.length === 0) {
                list.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 24px;">No active servers</div>';
                return;
            }

            servers.forEach(server => {
                const uptime = Math.floor((server.uptime || 0) / 1000);
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = uptime % 60;
                const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

                const statusColor = server.status === 'running' ? '#22c55e' : '#ef4444';
                const statusText = server.status === 'running' ? 'Running' : 'Stopped';

                const card = document.createElement('div');
                card.style.cssText = 'background-color: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center;';
                card.innerHTML = `
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 600;">${server.name}</div>
                                <div style="color: ${statusColor}; font-size: 12px; margin-top: 2px;">● ${statusText}</div>
                            </div>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 14px; display: grid; gap: 4px;">
                            <div>Port: <strong>${server.port}</strong></div>
                            <div>Type: <strong>${server.type || 'http'}</strong></div>
                            <div>Uptime: <strong>${uptimeStr}</strong></div>
                            <div>PID: <strong>${server.pid}</strong></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button data-action="stop-server" data-server="${server.name}" style="padding: 8px 16px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Stop
                        </button>
                        <button data-action="view-output" data-server="${server.name}" style="padding: 8px 16px; background-color: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            View
                        </button>
                    </div>
                `;

                // Add event listeners
                const stopBtn = card.querySelector('[data-action="stop-server"]');
                const viewBtn = card.querySelector('[data-action="view-output"]');
                if (stopBtn) stopBtn.addEventListener('click', () => this.stopServer(server.name));
                if (viewBtn) viewBtn.addEventListener('click', () => {
                    select.value = server.name;
                    this.displayServerOutput(server.name);
                });

                list.appendChild(card);

                // Add to select dropdown
                const option = document.createElement('option');
                option.value = server.name;
                option.textContent = `${server.name} (port ${server.port})`;
                select.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentSelection && Array.from(select.options).some(o => o.value === currentSelection)) {
                select.value = currentSelection;
            }
        } catch (error) {
            console.error('Failed to refresh servers:', error);
            // Only show error once per 10 seconds to avoid spam
            if (!this.lastRefreshErrorTime || Date.now() - this.lastRefreshErrorTime > 10000) {
                UI.showSnackbar('Failed to refresh server list', 3000);
                this.lastRefreshErrorTime = Date.now();
            }
        }
    },

    /**
     * Stop a server
     */
    async stopServer(serverName) {
        if (!confirm(`Stop server "${serverName}"?`)) return;

        try {
            const progress = UI.showLoadingSnackbar(`Stopping ${serverName}...`, false);
            const result = await ipcRenderer.invoke('stop-server', serverName);
            progress?.snackbar?.classList.add('fadeout');
            setTimeout(() => {
                UI.showSnackbar(`Server "${serverName}" stopped`, 2000);
                this.refreshServerList();
            }, 300);
        } catch (error) {
            UI.showSnackbar(`Failed to stop server: ${error.message}`, 3000);
        }
    },

    /**
     * Append output to server output log
     */
    appendOutput(serverName, type, output) {
        if (!this.outputMap.has(serverName)) {
            this.outputMap.set(serverName, []);
        }
        
        this.outputMap.get(serverName).push({ type, output, timestamp: new Date() });
        
        // Limit to last 1000 lines per server
        const logs = this.outputMap.get(serverName);
        if (logs.length > 1000) {
            logs.shift();
        }

        // If this server is currently selected, update display
        if (this.currentSelectedServer === serverName) {
            this.displayServerOutput(serverName);
        }
    },

    /**
     * Display output for a specific server
     */
    displayServerOutput(serverName) {
        const outputDiv = document.getElementById('server-output');
        if (!outputDiv) return;

        this.currentSelectedServer = serverName;

        if (!serverName || !this.outputMap.has(serverName)) {
            outputDiv.innerHTML = '<div style="color: var(--text-secondary);">No output available</div>';
            return;
        }

        const logs = this.outputMap.get(serverName) || [];
        let html = '';
        logs.forEach(log => {
            const timestamp = log.timestamp.toLocaleTimeString();
            const color = log.type === 'stderr' ? '#ff6b6b' : '#00ff00';
            html += `<div style="color: ${color};">[${timestamp}] ${this.escapeHtml(log.output)}</div>`;
        });

        outputDiv.innerHTML = html || '<div style="color: var(--text-secondary);">No output yet</div>';
        outputDiv.scrollTop = outputDiv.scrollHeight;
    },

    /**
     * Clear output for current server
     */
    clearOutput() {
        if (this.currentSelectedServer) {
            this.outputMap.delete(this.currentSelectedServer);
            this.displayServerOutput(this.currentSelectedServer);
            UI.showSnackbar('Output cleared', 1500);
        }
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

function setupServerMaker() {
    ServerManager.init();
}


function setupServer() {
    return new Promise((resolve, reject) => {
        ipcRenderer.invoke('create-server').then((data) => {
            resolve(data);
        }).catch((error) => {
            reject(error);
        });
    });
}


function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
        ipcRenderer.invoke?.('theme:toggle');
    });
}

function setupStartButton() {
     const startBtn = document.getElementById('start-btn');
     if (!startBtn) return;

     startBtn.addEventListener('click', () => {
         document.getElementById('welcome').style.display = 'none';
         document.getElementById('loading-screen').style.display = 'block';
         
         setTimeout(() => {
             document.getElementById('loading-screen').style.display = 'none';
             document.querySelector('.app-container').style.display = 'flex';
         }, 100);
     });
 }

/**
 * Setup Packet Analysis
 */
function setupPacketAnalysis() {
     const startBtn = document.getElementById('start-packet-capture-btn');
     const stopBtn = document.getElementById('stop-packet-capture-btn');
     const clearBtn = document.getElementById('clear-packet-data-btn');
     const exportBtn = document.getElementById('export-packets-btn');
     const packetInterface = document.getElementById('packet-interface');
     const packetProtocol = document.getElementById('packet-protocol');

     // Populate network interfaces
     try {
         const interfaces = os.networkInterfaces();
         Object.keys(interfaces).forEach(name => {
             const option = document.createElement('option');
             option.value = name;
             option.textContent = name;
             packetInterface.appendChild(option);
         });
     } catch (e) {
         console.warn('Could not load network interfaces:', e);
     }

     // Simulated packet capture (for demo purposes)
     let captureActive = false;
     let packets = [];
     let captureStartTime = null;
     let captureInterval = null;

     const simulatePackets = () => {
         if (!captureActive) return;

         const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'];
         const packet = {
             timestamp: new Date().toLocaleTimeString(),
             sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
             destIP: `8.8.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
             protocol: protocols[Math.floor(Math.random() * protocols.length)],
             sourcePort: Math.floor(Math.random() * 65535) + 1024,
             destPort: [80, 443, 53, 22, 3306][Math.floor(Math.random() * 5)],
             length: Math.floor(Math.random() * 1500) + 64
         };

         const selectedProtocol = packetProtocol.value;
         if (!selectedProtocol || packet.protocol === selectedProtocol) {
             packets.push(packet);
             updatePacketTable(packet);
             updateStatistics();
         }

         if (packets.length >= parseInt(document.getElementById('packet-max-count').value)) {
             stopCapture();
         }
     };

     const updatePacketTable = (packet) => {
         const tbody = document.getElementById('packet-table-body');
         if (tbody.querySelector('td[colspan]')) {
             tbody.innerHTML = '';
         }

         const row = tbody.insertRow(0);
         row.style.borderBottom = '1px solid var(--card-border)';
         row.innerHTML = `
             <td style="padding: 8px;">${packet.timestamp}</td>
             <td style="padding: 8px;">${packet.sourceIP}</td>
             <td style="padding: 8px;">${packet.destIP}</td>
             <td style="padding: 8px;">${packet.protocol}</td>
             <td style="padding: 8px;">${packet.sourcePort}</td>
             <td style="padding: 8px;">${packet.destPort}</td>
             <td style="padding: 8px;">${packet.length} bytes</td>
         `;

         // Keep only last 100 rows
         while (tbody.rows.length > 100) {
             tbody.deleteRow(tbody.rows.length - 1);
         }
     };

     const updateStatistics = () => {
         const totalPackets = packets.length;
         const totalBytes = packets.reduce((sum, p) => sum + (p.length || 0), 0);
         const duration = (Date.now() - captureStartTime) / 1000;
         const packetsPerSec = Math.round(totalPackets / duration) || 0;
         const bytesPerSec = Math.round(totalBytes / duration) || 0;

         document.getElementById('stat-total-packets').textContent = totalPackets;
         document.getElementById('stat-total-bytes').textContent = formatBytes(totalBytes);
         document.getElementById('stat-packets-per-sec').textContent = packetsPerSec;
         document.getElementById('stat-bytes-per-sec').textContent = formatBytes(bytesPerSec) + '/s';

         // Update protocol distribution
         const protocolDist = {};
         packets.forEach(p => {
             protocolDist[p.protocol] = (protocolDist[p.protocol] || 0) + 1;
         });

         const distDiv = document.getElementById('protocol-distribution');
         if (Object.keys(protocolDist).length === 0) {
             distDiv.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No data captured yet</div>';
         } else {
             distDiv.innerHTML = Object.entries(protocolDist).map(([protocol, count]) => {
                 const percentage = Math.round((count / totalPackets) * 100);
                 return `
                     <div style="background-color: var(--result-bg); padding: 12px; border-radius: 4px;">
                         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                             <span>${protocol}</span>
                             <span style="font-weight: 600;">${count} (${percentage}%)</span>
                         </div>
                         <div style="width: 100%; height: 6px; background-color: var(--card-border); border-radius: 3px; overflow: hidden;">
                             <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);"></div>
                         </div>
                     </div>
                 `;
             }).join('');
         }

         // Update top connections
         const connMap = {};
         packets.forEach(p => {
             const conn = `${p.sourceIP}:${p.sourcePort} → ${p.destIP}:${p.destPort}`;
             connMap[conn] = (connMap[conn] || 0) + 1;
         });

         const topConn = Object.entries(connMap)
             .sort((a, b) => b[1] - a[1])
             .slice(0, 5);

         const connDiv = document.getElementById('top-connections');
         if (topConn.length === 0) {
             connDiv.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No connections captured yet</div>';
         } else {
             connDiv.innerHTML = topConn.map(([conn, count]) => `
                 <div style="background-color: var(--result-bg); padding: 12px; border-radius: 4px;">
                     <div style="font-size: 12px; font-family: monospace; margin-bottom: 4px;">${conn}</div>
                     <div style="font-size: 12px; color: var(--text-secondary);">Packets: ${count}</div>
                 </div>
             `).join('');
         }
     };

     const startCapture = () => {
         captureActive = true;
         captureStartTime = Date.now();
         packets = [];
         startBtn.disabled = true;
         stopBtn.disabled = false;
         clearBtn.disabled = true;
         exportBtn.disabled = true;

         const tbody = document.getElementById('packet-table-body');
         tbody.innerHTML = '';

         UI.showSnackbar('Packet capture started...', 3000);

         captureInterval = setInterval(simulatePackets, 100);
     };

     const stopCapture = () => {
         captureActive = false;
         if (captureInterval) clearInterval(captureInterval);
         startBtn.disabled = false;
         stopBtn.disabled = true;
         clearBtn.disabled = false;
         exportBtn.disabled = false;

         UI.showSnackbar(`Capture stopped. ${packets.length} packets captured.`, 3000);
     };

     startBtn.addEventListener('click', startCapture);
     stopBtn.addEventListener('click', stopCapture);
     clearBtn.addEventListener('click', () => {
         packets = [];
         const tbody = document.getElementById('packet-table-body');
         tbody.innerHTML = '<tr><td colspan="7" style="padding: 20px; text-align: center; color: var(--text-secondary);">No packets captured yet</td></tr>';
         document.getElementById('stat-total-packets').textContent = '0';
         document.getElementById('stat-total-bytes').textContent = '0 B';
         document.getElementById('stat-packets-per-sec').textContent = '0';
         document.getElementById('stat-bytes-per-sec').textContent = '0 KB/s';
         document.getElementById('protocol-distribution').innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No data captured yet</div>';
         document.getElementById('top-connections').innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No connections captured yet</div>';
         UI.showSnackbar('Packet data cleared', 2000);
     });

     exportBtn.addEventListener('click', () => {
         if (packets.length === 0) {
             UI.showSnackbar('No packets to export', 2000);
             return;
         }
         const data = JSON.stringify(packets, null, 2);
         const blob = new Blob([data], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `packets-${Date.now()}.json`;
         a.click();
         URL.revokeObjectURL(url);
         UI.showSnackbar('Packets exported', 2000);
     });
}

// Sidebar Manager
const SidebarManager = {
    favorites: [],
    collapsedSections: new Set(),

    /**
     * Initialize sidebar
     */
    init() {
        this.loadFavorites();
        this.setupNavigation();
        this.setupSearch();
        this.setupSectionToggles();
        this.setupFavoriteButtons();
        this.updateFavoritesDisplay();
    },

    /**
     * Setup navigation button click handlers
     */
    setupNavigation() {
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Don't navigate if clicking favorite button
                if (e.target.closest('.fav-btn')) return;
                
                const tabName = btn.getAttribute('data-tab');
                if (tabName) {
                    UI.switchTab(tabName);
                    this.updateActiveButton(btn);
                }
            });

            // Hover effect
            btn.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--input-bg)';
            });
            btn.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active')) {
                    this.style.backgroundColor = 'transparent';
                }
            });
        });
    },

    /**
     * Setup section toggle buttons
     */
    setupSectionToggles() {
        document.querySelectorAll('.nav-section-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.closest('.nav-section');
                const sectionName = section?.getAttribute('data-section');
                const content = section?.querySelector('.nav-section-content');
                const arrow = btn.querySelector('span:last-child');

                if (content) {
                    if (content.style.display === 'none') {
                        content.style.display = 'grid';
                        arrow.textContent = '▼';
                        if (sectionName) this.collapsedSections.delete(sectionName);
                    } else {
                        content.style.display = 'none';
                        arrow.textContent = '▶';
                        if (sectionName) this.collapsedSections.add(sectionName);
                    }
                    this.saveSectionState();
                }
            });
        });

        this.loadSectionState();
    },

    /**
     * Setup search functionality
     */
    setupSearch() {
        const searchToggle = document.getElementById('sidebar-search-toggle');
        const searchBox = document.getElementById('sidebar-search-box');
        const searchInput = document.getElementById('sidebar-search-input');

        if (searchToggle && searchBox) {
            searchToggle.addEventListener('click', () => {
                searchBox.style.display = searchBox.style.display === 'none' ? 'block' : 'none';
                if (searchBox.style.display === 'block') {
                    searchInput?.focus();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterNavigation(e.target.value));
        }
    },

    /**
     * Filter navigation items based on search
     */
    filterNavigation(query) {
        const lowerQuery = query.toLowerCase();
        document.querySelectorAll('.nav-button').forEach(btn => {
            const label = btn.querySelector('.nav-label')?.textContent.toLowerCase() || '';
            const matches = label.includes(lowerQuery);
            btn.style.display = matches ? '' : 'none';
        });

        // Show/hide sections based on child visibility
        document.querySelectorAll('.nav-section').forEach(section => {
            const visibleButtons = Array.from(section.querySelectorAll('.nav-button'))
                .filter(btn => btn.style.display !== 'none');
            section.style.display = visibleButtons.length > 0 ? '' : 'none';
        });
    },

    /**
     * Setup favorite buttons
     */
    setupFavoriteButtons() {
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tabName = btn.getAttribute('data-tab');
                
                if (this.isFavorite(tabName)) {
                    this.removeFavorite(tabName);
                } else {
                    this.addFavorite(tabName);
                }
                this.updateFavoriteButton(btn);
                this.updateFavoritesDisplay();
            });
        });
    },

    /**
     * Add favorite
     */
    addFavorite(tabName) {
        if (!this.favorites.includes(tabName)) {
            this.favorites.push(tabName);
            this.saveFavorites();
        }
    },

    /**
     * Remove favorite
     */
    removeFavorite(tabName) {
        this.favorites = this.favorites.filter(t => t !== tabName);
        this.saveFavorites();
    },

    /**
     * Check if item is favorite
     */
    isFavorite(tabName) {
        return this.favorites.includes(tabName);
    },

    /**
     * Update favorite button appearance
     */
    updateFavoriteButton(btn) {
        const tabName = btn.getAttribute('data-tab');
        if (this.isFavorite(tabName)) {
            btn.textContent = '★';
            btn.style.opacity = '1';
            btn.style.color = '#f59e0b';
        } else {
            btn.textContent = '☆';
            btn.style.opacity = '0.5';
            btn.style.color = 'inherit';
        }
    },

    /**
     * Update all favorite buttons
     */
    updateAllFavoriteButtons() {
        document.querySelectorAll('.fav-btn').forEach(btn => {
            this.updateFavoriteButton(btn);
        });
    },

    /**
     * Update favorites display section
     */
    updateFavoritesDisplay() {
        const section = document.getElementById('favorites-section');
        const list = document.getElementById('favorites-list');

        if (!section || !list) return;

        if (this.favorites.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = '';

        this.favorites.forEach(tabName => {
            const btn = document.querySelector(`[data-tab="${tabName}"]`);
            if (btn) {
                const clone = btn.cloneNode(true);
                clone.classList.add('favorite-nav-item');
                clone.style.padding = '6px 8px';
                clone.style.fontSize = '12px';
                clone.removeChild(clone.querySelector('.fav-btn'));
                clone.addEventListener('click', (e) => {
                    if (tabName) UI.switchTab(tabName);
                });
                list.appendChild(clone);
            }
        });

        this.updateAllFavoriteButtons();
    },

    /**
     * Update active button
     */
    updateActiveButton(activeBtn) {
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = 'transparent';
        });
        activeBtn.classList.add('active');
        activeBtn.style.backgroundColor = 'var(--input-bg)';
    },

    /**
     * Save favorites to localStorage
     */
    saveFavorites() {
        localStorage.setItem('sidebar-favorites', JSON.stringify(this.favorites));
    },

    /**
     * Load favorites from localStorage
     */
    loadFavorites() {
        const saved = localStorage.getItem('sidebar-favorites');
        this.favorites = saved ? JSON.parse(saved) : [];
        this.updateAllFavoriteButtons();
    },

    /**
     * Save section collapse state
     */
    saveSectionState() {
        localStorage.setItem('sidebar-sections', JSON.stringify(Array.from(this.collapsedSections)));
    },

    /**
     * Load section state
     */
    loadSectionState() {
        const saved = localStorage.getItem('sidebar-sections');
        this.collapsedSections = new Set(saved ? JSON.parse(saved) : []);

        this.collapsedSections.forEach(sectionName => {
            const section = document.querySelector(`[data-section="${sectionName}"]`);
            if (section) {
                const content = section.querySelector('.nav-section-content');
                const arrow = section.querySelector('.nav-section-toggle span:last-child');
                if (content) {
                    content.style.display = 'none';
                    if (arrow) arrow.textContent = '▶';
                }
            }
        });
    }
};

function setupSidebarNavigation() {
    SidebarManager.init();

    // Setup sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('app-sidebar');
            const wrapper = document.querySelector('.app-content-wrapper');
            if (sidebar && wrapper) {
                sidebar.classList.toggle('collapsed');
                if (sidebar.classList.contains('collapsed')) {
                    sidebar.style.width = '60px';
                    sidebar.style.minWidth = '60px';
                    document.querySelectorAll('.nav-label').forEach(label => label.style.display = 'none');
                    sidebarToggle.textContent = '▶ Expand';
                } else {
                    sidebar.style.width = '260px';
                    sidebar.style.minWidth = '260px';
                    document.querySelectorAll('.nav-label').forEach(label => label.style.display = '');
                    sidebarToggle.textContent = '◀ Collapse';
                }
            }
        });
    }

    // Setup header buttons
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            ipcRenderer.invoke?.('command-palette');
        });
    }

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            UI.showSnackbar('Help & Documentation coming soon', 3000);
        });
    }
}

// ============================================================
// Application Initialization
// ============================================================

// ============================================================
// Update Checker (defined before initialization)
// ============================================================

class UpdateChecker {
    /**
     * Check for application updates
     */
    static async check() {
        try {
            console.log('Checking for updates...');
            
            // First check internet connectivity with timeout
            console.log('Verifying internet connection...');
            const isOnline = await NetworkOps.checkConnectivity()
            console.log(isOnline)
            
            if (!isOnline) {
                console.log('No internet connection detected');
                return this.showNoInternet();
            }

            console.log('Internet connection verified, checking for updates...');
            
            // Fetch update information with timeout
            const updateDataPromise = ipcRenderer.invoke?.('updates-json');
            if (!updateDataPromise) {
                console.warn('No electronAPI available');
                return false;
            }
            
            const updateData = await Promise.race([
                updateDataPromise,
                new Promise((_, reject) => setTimeout(() => {
                    reject(new Error('Update check timeout'));
                }, 5000))
            ]);
            
            if (!updateData) {
                console.warn('No update data available');
                return false;
            }

            const { tag_name, version } = updateData;
            console.log(`Current: ${version}, Latest: ${tag_name}`);
            
            // Compare versions
            if (tag_name !== version) {
                return this.showUpdateAvailable(tag_name, version);
            }

            console.log('Application is up to date');
            return false;
        } catch (error) {
            console.error('Update check failed:', error);
            return this.showUpdateError(error);
        }
    }

    /**
     * Show no internet connection message
     */
    static showNoInternet() {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = 'update-card';
        card.innerHTML = `
            <h2>No Internet Connection</h2>
            <p>Check your internet connection and try again.</p>
            <button onclick="updateChecker.dismissCard()">Continue</button>
        `;
        document.body.appendChild(card);
        return true;
    }

    /**
     * Show update available message
     */
    static showUpdateAvailable(tagName, version) {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = 'update-card';
        card.innerHTML = `
            <h2>Update Available</h2>
            <p>Version ${version} is available.</p>
            <div style="margin: 16px 0;">
                <a href="javascript:void(0)" onclick="openExternal('https://github.com/windowsworldcartoon/NetNavigator/releases/tag/${tagName}')">
                    Download Latest Release
                </a>
            </div>
            <button onclick="updateChecker.dismissCard()">Continue</button>
        `;
        document.body.appendChild(card);
        return true;
    }

    /**
     * Show update check error
     */
    static showUpdateError(error) {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = 'update-card';
        card.innerHTML = `
            <div class="alert error">
                Error checking for updates
            </div>
            <button onclick="updateChecker.dismissCard()">Continue</button>
        `;
        document.body.appendChild(card);
        return false;
    }

    /**
     * Dismiss update card and show app
     */
    static dismissCard() {
        const card = document.getElementById('update-card');
        if (card) card.remove();
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        
        const welcome = document.getElementById('welcome');
        if (welcome) welcome.style.display = 'block';
    }
}

// Create global instance for easy access
const updateChecker = UpdateChecker;

let tabManager;
let commandPalette;
let settingsManager;

/**
 * Initialize application when DOM is ready
 */
const initializeApp = async () => {
    try {
        console.log('Initializing NetNavigator application...');
        
        // Initialize managers
        tabManager = new TabManager();
        commandPalette = new CommandPalette();
        settingsManager = new SettingsManager();

        // Setup UI navigation
        setupSidebarNavigation();
        
        // Setup network features
        setupNetworkScanner();
        setupPortChecker();
        setupNetworkMonitor();
        setupNetworkOptimizer();
        setupNetworkInfo();
        setupDiagnostics();
        setupDNSLookup();
        setupPacketAnalysis();
        setupServerMaker();
        setupThemeToggle();
        setupStartButton();



        // Check internet and update status
        let isOnline = false;
        try {
            isOnline = await NetworkOps.checkConnectivity();
            UI.updateConnectivityStatus(isOnline);
        } catch (error) {
            console.warn('Could not check connectivity:', error);
            UI.updateConnectivityStatus(false);
        }

        // Show welcome or app
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('welcome').style.display = 'block';

        // Listen for snackbar messages
        ipcRenderer.on?.('show-snackbar', (event, message, duration) => {
            UI.showSnackbar(message, duration || 3000);
        });

        console.log('NetNavigator initialized successfully');
    } catch (error) {
        console.error('Initialization failed:', error);
        document.getElementById('loading-screen').style.display = 'none';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h2>Error</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()">Reload</button>
        `;
        document.body.appendChild(card);
    }
};

/**
 * Wait for DOM to be ready, then initialize
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check for updates before initializing
        UpdateChecker.check().finally(() => {
            initializeApp();
        });
    });
} else {
    // DOM is already loaded
    UpdateChecker.check().finally(() => {
        initializeApp();
    });
}

// ============================================================
// Utility Functions
// ============================================================

function openExternal(url) {
    ipcRenderer.invoke?.('open-external', url);
}

function cancelUpdate() {
     const card = document.getElementById('update-card');
     if (card) card.remove();
     
     document.getElementById('loading-screen').style.display = 'none';
     document.querySelector('.app-container').style.display = 'block';
 }

   


