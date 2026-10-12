/**
 * ============================================================================
 * HabitFlow Pro - Universal Touch & Pointer Drag-and-Drop Engine
 * ============================================================================
 * Supports smooth, lag-free reordering for both mouse (Desktop) and touch (iOS/Android)
 * with grid-aware drop targets, visual ghosting, haptics, and habit stacking support.
 */

(function (window) {
  'use strict';

  class DragDropEngine {
    /**
     * Make a container's children sortable (list or grid)
     * @param {Object} options
     * @param {HTMLElement} options.container - The parent element
     * @param {string} options.itemSelector - Selector for sortable items (e.g. '.bento-widget-card')
     * @param {string} [options.handleSelector] - Optional handle to initiate drag (e.g. '.bento-drag-handle')
     * @param {Function} options.onReorder - (fromIndex, toIndex, itemElement) => void
     * @param {Function} [options.onStack] - (sourceId, targetId) => void (for habit chaining)
     */
    static makeSortable(options) {
      const { container, itemSelector, handleSelector, onReorder, onStack } = options;
      if (!container) return;

      let draggedItem = null;
      let placeholder = null;
      let startX = 0;
      let startY = 0;
      let initialIndex = -1;
      let isDragging = false;

      // Create placeholder
      const createPlaceholder = (targetEl) => {
        const ph = document.createElement('div');
        ph.className = 'bento-drop-placeholder';
        ph.style.height = `${targetEl.offsetHeight || 80}px`;
        ph.style.borderRadius = window.getComputedStyle(targetEl).borderRadius || '24px';
        ph.style.border = '2px dashed rgba(0, 0, 0, 0.2)';
        ph.style.background = 'rgba(0, 0, 0, 0.03)';
        ph.style.margin = '4px 0';
        ph.style.boxSizing = 'border-box';
        ph.style.transition = 'all 0.15s ease';
        if (targetEl.classList.contains('span-full') || targetEl.classList.contains('span-2')) {
          ph.classList.add('span-full');
          ph.style.gridColumn = '1 / -1';
        }
        return ph;
      };

      // -------------------------------------------------------------
      // Touch Event Handlers (iOS & Android Touch Support)
      // -------------------------------------------------------------
      const onTouchStart = (e) => {
        // Check handle if specified
        if (handleSelector) {
          const handle = e.target.closest(handleSelector);
          if (!handle) return;
        }

        const item = e.target.closest(itemSelector);
        if (!item || !container.contains(item)) return;

        // Ignore interactive buttons (checkboxes, inputs, selects, links) unless clicked on handle
        if (!handleSelector && e.target.closest('button, input, select, textarea, a')) return;

        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        draggedItem = item;
        initialIndex = Array.from(container.children).filter(el => el.matches(itemSelector)).indexOf(draggedItem);
        isDragging = false;

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
      };

      const onTouchMove = (e) => {
        if (!draggedItem) return;
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);

        // Prevent accidental activation during normal page scroll
        if (!isDragging) {
          if (deltaY > 8 || deltaX > 8) {
            isDragging = true;
            if (window.app && window.app.triggerHaptic) window.app.triggerHaptic('light');

            draggedItem.classList.add('is-dragging');
            placeholder = createPlaceholder(draggedItem);
            container.insertBefore(placeholder, draggedItem);
            draggedItem.style.position = 'relative';
            draggedItem.style.zIndex = '100';
            draggedItem.style.pointerEvents = 'none';
          } else {
            return;
          }
        }

        e.preventDefault(); // Stop native page scrolling once dragging begins

        // Position feedback
        draggedItem.style.transform = `translate(${touch.clientX - startX}px, ${touch.clientY - startY}px) scale(1.02)`;

        // Find element under touch point
        draggedItem.style.visibility = 'hidden';
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        draggedItem.style.visibility = '';

        if (!elementBelow) return;
        const targetItem = elementBelow.closest(itemSelector);

        if (targetItem && targetItem !== draggedItem && container.contains(targetItem)) {
          const rect = targetItem.getBoundingClientRect();
          const targetMidY = rect.top + rect.height / 2;

          if (touch.clientY < targetMidY) {
            container.insertBefore(placeholder, targetItem);
          } else {
            container.insertBefore(placeholder, targetItem.nextSibling);
          }
        }
      };

      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);

        if (!draggedItem) return;

        if (isDragging && placeholder) {
          draggedItem.classList.remove('is-dragging');
          draggedItem.style.position = '';
          draggedItem.style.zIndex = '';
          draggedItem.style.transform = '';
          draggedItem.style.pointerEvents = '';

          container.insertBefore(draggedItem, placeholder);
          placeholder.remove();

          const allItems = Array.from(container.children).filter(el => el.matches(itemSelector));
          const newIndex = allItems.indexOf(draggedItem);

          if (initialIndex !== -1 && newIndex !== -1 && initialIndex !== newIndex) {
            if (window.app && window.app.triggerHaptic) window.app.triggerHaptic('double');
            if (typeof onReorder === 'function') {
              onReorder(initialIndex, newIndex, draggedItem);
            }
          }
        } else {
          draggedItem.style.transform = '';
        }

        draggedItem = null;
        placeholder = null;
        isDragging = false;
      };

      container.addEventListener('touchstart', onTouchStart, { passive: true });

      // -------------------------------------------------------------
      // HTML5 Drag and Drop for Desktop / Mouse
      // -------------------------------------------------------------
      const refreshDesktopHandlers = () => {
        const items = container.querySelectorAll(itemSelector);
        items.forEach(item => {
          item.setAttribute('draggable', 'true');

          item.ondragstart = (e) => {
            draggedItem = item;
            initialIndex = Array.from(container.children).filter(el => el.matches(itemSelector)).indexOf(draggedItem);
            item.classList.add('is-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.id || item.dataset.widgetId || '');
            if (window.app && window.app.triggerHaptic) window.app.triggerHaptic('light');
          };

          item.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!draggedItem || draggedItem === item) return;

            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;

            if (e.clientY < midY) {
              container.insertBefore(draggedItem, item);
            } else {
              container.insertBefore(draggedItem, item.nextSibling);
            }
          };

          item.ondragend = () => {
            item.classList.remove('is-dragging');
            const allItems = Array.from(container.children).filter(el => el.matches(itemSelector));
            const newIndex = allItems.indexOf(draggedItem);

            if (initialIndex !== -1 && newIndex !== -1 && initialIndex !== newIndex) {
              if (window.app && window.app.triggerHaptic) window.app.triggerHaptic('double');
              if (typeof onReorder === 'function') {
                onReorder(initialIndex, newIndex, draggedItem);
              }
            }
            draggedItem = null;
          };
        });
      };

      refreshDesktopHandlers();
    }
  }

  window.HabitFlowDragDrop = DragDropEngine;
})(window);
