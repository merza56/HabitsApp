/**
 * ============================================================================
 * HabitFlow Pro - Open-Source Plugin & Extension Architecture
 * ============================================================================
 * Enables any developer to create modular plugins, widgets, and custom logic
 * with full lifecycle hooks, safely isolated from core execution.
 */

(function (window) {
  'use strict';

  class PluginSystem {
    constructor(appInstance) {
      this.app = appInstance;
      this.plugins = new Map();
      this.hooks = new Map();
      this.enabledState = this.loadEnabledState();
    }

    loadEnabledState() {
      try {
        const stored = localStorage.getItem('habitflow_plugins_state_v1');
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    }

    saveEnabledState() {
      try {
        localStorage.setItem('habitflow_plugins_state_v1', JSON.stringify(this.enabledState));
      } catch (e) {}
    }

    /**
     * Register a new plugin
     * @param {Object} manifest
     * @param {string} manifest.id - Unique ID (e.g. 'pomodoro-timer', 'streak-shield')
     * @param {string} manifest.name - Human-readable name
     * @param {string} [manifest.version='1.0.0']
     * @param {string} [manifest.author='']
     * @param {string} [manifest.description='']
     * @param {Function} [manifest.init] - Initialization method receiving app instance
     * @param {Object} [manifest.hooks] - Map of hook callbacks
     * @param {Array} [manifest.widgets] - Optional widgets registered by this plugin
     */
    register(manifest) {
      if (!manifest || !manifest.id) {
        console.error('[PluginSystem] Plugin must have a valid id');
        return false;
      }

      if (this.plugins.has(manifest.id)) {
        console.warn(`[PluginSystem] Plugin "${manifest.id}" is already registered. Updating...`);
      }

      const pluginEntry = {
        id: manifest.id,
        name: manifest.name || manifest.id,
        version: manifest.version || '1.0.0',
        author: manifest.author || 'Community',
        description: manifest.description || '',
        manifest: manifest,
        enabled: this.enabledState[manifest.id] !== false, // default enabled
        initialized: false
      };

      this.plugins.set(manifest.id, pluginEntry);

      // Register hooks if enabled
      if (pluginEntry.enabled) {
        this.activatePlugin(pluginEntry);
      }

      if (this.app && this.app.events) {
        this.app.events.emit('plugin:registered', pluginEntry);
      }

      return true;
    }

    /**
     * Activate / Initialize a plugin
     */
    activatePlugin(pluginEntry) {
      if (!pluginEntry || pluginEntry.initialized) return;

      try {
        if (typeof pluginEntry.manifest.init === 'function') {
          pluginEntry.manifest.init(this.app);
        }
        pluginEntry.initialized = true;

        // Register hook listeners
        if (pluginEntry.manifest.hooks && typeof pluginEntry.manifest.hooks === 'object') {
          for (const [hookName, callback] of Object.entries(pluginEntry.manifest.hooks)) {
            if (typeof callback === 'function') {
              this.addHook(hookName, pluginEntry.id, callback);
            }
          }
        }

        // Register widgets if provided
        if (Array.isArray(pluginEntry.manifest.widgets) && this.app && this.app.widgets) {
          pluginEntry.manifest.widgets.forEach(w => {
            w.pluginId = pluginEntry.id;
            this.app.widgets.register(w);
          });
        }
      } catch (err) {
        console.error(`[PluginSystem] Failed to activate plugin "${pluginEntry.id}":`, err);
      }
    }

    /**
     * Add a hook callback
     */
    addHook(hookName, pluginId, callback) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, new Map());
      }
      this.hooks.get(hookName).set(pluginId, callback);
    }

    /**
     * Execute all callbacks attached to a specific hook
     * @param {string} hookName
     * @param {*} context
     * @returns {*} Modified or input context
     */
    dispatchHook(hookName, context) {
      if (!this.hooks.has(hookName)) return context;

      let currentContext = context;
      const hookMap = this.hooks.get(hookName);

      for (const [pluginId, callback] of hookMap.entries()) {
        const plugin = this.plugins.get(pluginId);
        if (plugin && plugin.enabled) {
          try {
            const result = callback(currentContext, this.app);
            if (result !== undefined) {
              currentContext = result;
            }
          } catch (err) {
            console.error(`[PluginSystem] Error in hook "${hookName}" of plugin "${pluginId}":`, err);
          }
        }
      }

      return currentContext;
    }

    /**
     * Enable a registered plugin
     */
    enable(pluginId) {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) return false;

      plugin.enabled = true;
      this.enabledState[pluginId] = true;
      this.saveEnabledState();

      if (!plugin.initialized) {
        this.activatePlugin(plugin);
      }

      if (this.app && this.app.events) {
        this.app.events.emit('plugin:enabled', plugin);
      }
      return true;
    }

    /**
     * Disable a registered plugin
     */
    disable(pluginId) {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) return false;

      plugin.enabled = false;
      this.enabledState[pluginId] = false;
      this.saveEnabledState();

      if (this.app && this.app.events) {
        this.app.events.emit('plugin:disabled', plugin);
      }
      return true;
    }

    /**
     * Get a plugin entry
     */
    get(pluginId) {
      return this.plugins.get(pluginId);
    }

    /**
     * List all registered plugins
     */
    getAll() {
      return Array.from(this.plugins.values());
    }
  }

  window.HabitFlowPluginSystem = PluginSystem;
})(window);
