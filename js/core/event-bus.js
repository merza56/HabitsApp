/**
 * ============================================================================
 * HabitFlow Pro - Event Bus Engine
 * ============================================================================
 * Lightweight, robust publish/subscribe system facilitating decoupled
 * communication across habit trackers, analytics, widgets, and community plugins.
 */

(function (window) {
  'use strict';

  class EventBus {
    constructor() {
      this.listeners = new Map();
      this.onceListeners = new Map();
    }

    /**
     * Subscribe to an event topic
     * @param {string} event - Topic name (e.g., 'habit:complete', 'widget:reorder')
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
      if (typeof callback !== 'function') return () => {};
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);

      return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event topic once
     * @param {string} event - Topic name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
      if (typeof callback !== 'function') return;
      if (!this.onceListeners.has(event)) {
        this.onceListeners.set(event, new Set());
      }
      this.onceListeners.get(event).add(callback);
    }

    /**
     * Unsubscribe a handler from an event
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
      if (this.onceListeners.has(event)) {
        this.onceListeners.get(event).delete(callback);
      }
    }

    /**
     * Publish an event with payload data
     * @param {string} event - Topic name
     * @param {*} data - Payload passed to handlers
     */
    emit(event, data) {
      // Standard listeners
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[EventBus] Error in handler for "${event}":`, err);
          }
        });
      }

      // Once listeners
      if (this.onceListeners.has(event)) {
        const onceSet = this.onceListeners.get(event);
        onceSet.forEach(cb => {
          try {
            cb(data);
          } catch (err) {
            console.error(`[EventBus] Error in once handler for "${event}":`, err);
          }
        });
        this.onceListeners.delete(event);
      }
    }

    /**
     * Clear all listeners for an event or all events
     * @param {string} [event]
     */
    clear(event) {
      if (event) {
        this.listeners.delete(event);
        this.onceListeners.delete(event);
      } else {
        this.listeners.clear();
        this.onceListeners.clear();
      }
    }
  }

  window.HabitFlowEventBus = EventBus;
})(window);
