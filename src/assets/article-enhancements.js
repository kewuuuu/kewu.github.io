(function () {
  "use strict";

  var COLUMN_KEY_PREFIX = "kewu:columns:";
  var COLUMN_MIN_WIDTH = 160;
  var HOVER_HIDE_DELAY = 170;
  var HOVER_GAP = 10;
  var HOVER_VIEWPORT_PADDING = 8;
  var resizeItems = [];
  var hashBindingsReady = false;
  var hoverController = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // ignore write failures
    }
  }

  function isCompactViewport() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function parseRatios(raw, expectedLength) {
    var values = String(raw || "")
      .split(",")
      .map(function (item) {
        var value = Number.parseFloat(item.trim());
        return Number.isFinite(value) && value > 0 ? value : null;
      })
      .filter(Boolean);

    if (values.length !== expectedLength) {
      values = new Array(expectedLength).fill(1);
    }

    return values;
  }

  function getColumnStorageKey(containerEl) {
    return COLUMN_KEY_PREFIX + window.location.pathname + ":" + (containerEl.dataset.columnsId || "columns");
  }

  function normalizeRatios(ratios) {
    var total = 0;
    for (var i = 0; i < ratios.length; i += 1) {
      total += ratios[i];
    }
    if (total <= 0) {
      return ratios.map(function () {
        return 1;
      });
    }
    return ratios.map(function (value) {
      return value / total;
    });
  }

  function getSplitterWidth(containerEl) {
    var value = window.getComputedStyle(containerEl).getPropertyValue("--md-columns-splitter-width");
    var parsed = Number.parseFloat(value || "");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
  }

  function getNodesInScope(rootEl, selector) {
    var nodes = [];
    if (!rootEl || !selector) {
      return nodes;
    }

    if (rootEl.nodeType === 1 && rootEl.matches && rootEl.matches(selector)) {
      nodes.push(rootEl);
    }

    var found = rootEl.querySelectorAll ? rootEl.querySelectorAll(selector) : [];
    for (var i = 0; i < found.length; i += 1) {
      nodes.push(found[i]);
    }

    return nodes;
  }

  function pruneResizeItems() {
    resizeItems = resizeItems.filter(function (item) {
      return item && item.containerEl && item.containerEl.isConnected;
    });
  }

  function applyColumnTemplate(item) {
    if (!item || !item.containerEl || !item.containerEl.isConnected) {
      return;
    }

    if (isCompactViewport()) {
      item.containerEl.style.gridTemplateColumns = "";
      return;
    }

    var parts = [];
    for (var i = 0; i < item.ratios.length; i += 1) {
      parts.push("minmax(" + COLUMN_MIN_WIDTH + "px, " + item.ratios[i].toFixed(6) + "fr)");
      if (i < item.ratios.length - 1) {
        parts.push("var(--md-columns-splitter-width)");
      }
    }
    item.containerEl.style.gridTemplateColumns = parts.join(" ");
  }

  function persistColumnRatios(item) {
    writeValue(getColumnStorageKey(item.containerEl), JSON.stringify(item.ratios));
  }

  function bindColumnSplitters(item) {
    for (var i = 0; i < item.splitterEls.length; i += 1) {
      (function (splitIndex) {
        var splitterEl = item.splitterEls[splitIndex];
        splitterEl.addEventListener("mousedown", function (event) {
          if (event.button !== 0 || isCompactViewport()) {
            return;
          }
          event.preventDefault();

          var startX = event.clientX;
          var startRatios = item.ratios.slice();
          var splitterWidth = getSplitterWidth(item.containerEl);
          var contentWidth = item.containerEl.getBoundingClientRect().width - splitterWidth * item.splitterEls.length;
          if (contentWidth <= COLUMN_MIN_WIDTH * 2) {
            return;
          }

          document.body.classList.add("md-columns-resizing");

          function handleMove(moveEvent) {
            var deltaX = moveEvent.clientX - startX;
            var leftStart = startRatios[splitIndex] * contentWidth;
            var pairTotal = (startRatios[splitIndex] + startRatios[splitIndex + 1]) * contentWidth;
            var newLeft = clamp(leftStart + deltaX, COLUMN_MIN_WIDTH, pairTotal - COLUMN_MIN_WIDTH);
            item.ratios[splitIndex] = newLeft / contentWidth;
            item.ratios[splitIndex + 1] = (pairTotal - newLeft) / contentWidth;
            applyColumnTemplate(item);
            persistColumnRatios(item);
          }

          function handleUp() {
            document.body.classList.remove("md-columns-resizing");
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
          }

          window.addEventListener("mousemove", handleMove);
          window.addEventListener("mouseup", handleUp);
        });
      })(i);
    }
  }

  function initColumns(rootEl) {
    pruneResizeItems();

    var scope = rootEl || document;
    var containers = getNodesInScope(scope, ".md-columns[data-columns-default]");
    for (var i = 0; i < containers.length; i += 1) {
      var containerEl = containers[i];
      if (containerEl.closest(".md-hover-card-def")) {
        continue;
      }
      if (containerEl.dataset.columnsBound === "1") {
        continue;
      }

      var columnEls = containerEl.querySelectorAll(":scope > .md-columns__column");
      var splitterEls = containerEl.querySelectorAll(":scope > .md-columns__splitter");
      if (columnEls.length < 2) {
        continue;
      }

      var defaultRatios = parseRatios(containerEl.dataset.columnsDefault || "", columnEls.length);
      var storedRatios = readJson(getColumnStorageKey(containerEl), []);
      var ratios = storedRatios.length === columnEls.length ? storedRatios : defaultRatios;
      var item = {
        containerEl: containerEl,
        splitterEls: splitterEls,
        ratios: normalizeRatios(ratios)
      };

      containerEl.dataset.columnsBound = "1";
      bindColumnSplitters(item);
      applyColumnTemplate(item);
      resizeItems.push(item);
    }
  }

  function flashTarget(targetEl) {
    if (!targetEl) {
      return;
    }
    targetEl.classList.remove("is-target-highlighted");
    window.requestAnimationFrame(function () {
      targetEl.classList.add("is-target-highlighted");
      window.setTimeout(function () {
        targetEl.classList.remove("is-target-highlighted");
      }, 1400);
    });
  }

  function highlightHashTarget() {
    var hash = window.location.hash || "";
    if (!hash || hash.length < 2) {
      return;
    }
    var targetEl = document.getElementById(decodeURIComponent(hash.slice(1)));
    flashTarget(targetEl);
  }

  function bindXrefsInRoot(rootEl) {
    var scope = rootEl || document;
    var xrefs = getNodesInScope(scope, ".md-xref[href^='#']");
    for (var i = 0; i < xrefs.length; i += 1) {
      var xrefEl = xrefs[i];
      if (xrefEl.dataset.xrefBound === "1") {
        continue;
      }

      xrefEl.dataset.xrefBound = "1";
      xrefEl.addEventListener("click", function (event) {
        var href = event.currentTarget.getAttribute("href") || "";
        if (!href.startsWith("#")) {
          return;
        }
        var targetEl = document.getElementById(decodeURIComponent(href.slice(1)));
        if (targetEl) {
          window.setTimeout(function () {
            flashTarget(targetEl);
          }, 30);
        }
      });
    }
  }

  function bindXrefs(rootEl) {
    bindXrefsInRoot(rootEl || document);

    if (!hashBindingsReady) {
      window.addEventListener("hashchange", highlightHashTarget);
      hashBindingsReady = true;
      highlightHashTarget();
    }
  }

  function createHoverController() {
    var definitions = Object.create(null);
    var hideTimer = 0;
    var holdByPointer = false;
    var activeTermEl = null;
    var popupEl = document.createElement("aside");
    popupEl.className = "md-hover-popup";
    popupEl.setAttribute("aria-hidden", "true");
    popupEl.innerHTML = '<div class="md-hover-popup__arrow" aria-hidden="true"></div><div class="md-hover-popup__inner"></div>';
    document.body.appendChild(popupEl);
    var popupInnerEl = popupEl.querySelector(".md-hover-popup__inner");

    function clearHideTimer() {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = 0;
      }
    }

    function setTermActive(termEl, isActive) {
      if (!termEl) {
        return;
      }
      termEl.classList.toggle("is-hover-active", isActive);
      termEl.setAttribute("aria-expanded", isActive ? "true" : "false");
    }

    function hideNow() {
      clearHideTimer();
      if (activeTermEl) {
        setTermActive(activeTermEl, false);
        activeTermEl = null;
      }
      popupEl.classList.remove("is-open", "is-above", "is-below");
      popupEl.setAttribute("aria-hidden", "true");
    }

    function shouldHoldOpen() {
      return holdByPointer || document.body.classList.contains("md-columns-resizing");
    }

    function scheduleHide(delay) {
      clearHideTimer();
      hideTimer = window.setTimeout(function () {
        if (shouldHoldOpen()) {
          scheduleHide(HOVER_HIDE_DELAY);
          return;
        }
        hideNow();
      }, Number.isFinite(delay) ? delay : HOVER_HIDE_DELAY);
    }

    function resolveDefinition(id) {
      if (!id) {
        return null;
      }
      if (definitions[id] && definitions[id].isConnected) {
        return definitions[id];
      }
      var selector = '.md-hover-card-def[data-hover-id="' + id + '"]';
      var found = document.querySelector(selector);
      if (found) {
        definitions[id] = found;
      }
      return found || null;
    }

    function cloneChildren(sourceEl, targetEl) {
      if (!sourceEl || !targetEl) {
        return;
      }
      for (var i = 0; i < sourceEl.childNodes.length; i += 1) {
        targetEl.appendChild(sourceEl.childNodes[i].cloneNode(true));
      }
    }

    function applyPopupSize(definitionEl) {
      popupEl.style.width = "";
      popupEl.style.maxWidth = "";

      var customWidth = definitionEl && definitionEl.style
        ? String(definitionEl.style.getPropertyValue("--md-hover-width") || "").trim()
        : "";
      var customMaxWidth = definitionEl && definitionEl.style
        ? String(definitionEl.style.getPropertyValue("--md-hover-max-width") || "").trim()
        : "";

      if (customWidth) {
        popupEl.style.width = customWidth;
      }
      popupEl.style.maxWidth = customMaxWidth || "min(460px, calc(100vw - 16px))";
    }

    function setPopupContent(definitionEl) {
      popupInnerEl.innerHTML = "";

      var titleSource = definitionEl.querySelector(":scope > .md-hover-card-def__title");
      if (titleSource) {
        var titleEl = titleSource.cloneNode(true);
        titleEl.classList.add("md-hover-popup__title");
        popupInnerEl.appendChild(titleEl);
      }

      var bodyEl = document.createElement("div");
      bodyEl.className = "md-hover-popup__content";
      var bodySource = definitionEl.querySelector(":scope > .md-hover-card-def__body");
      if (bodySource) {
        cloneChildren(bodySource, bodyEl);
      } else {
        cloneChildren(definitionEl, bodyEl);
      }

      var clonedColumns = bodyEl.querySelectorAll(".md-columns[data-columns-bound]");
      for (var i = 0; i < clonedColumns.length; i += 1) {
        clonedColumns[i].removeAttribute("data-columns-bound");
      }

      popupInnerEl.appendChild(bodyEl);

      initColumns(popupInnerEl);
      bindXrefs(popupInnerEl);
    }

    function positionPopup() {
      if (!activeTermEl || !activeTermEl.isConnected) {
        hideNow();
        return;
      }

      var termRect = activeTermEl.getBoundingClientRect();
      var popupRect = popupEl.getBoundingClientRect();
      var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      var spaceAbove = termRect.top;
      var spaceBelow = viewportHeight - termRect.bottom;
      var showAbove = spaceAbove > spaceBelow;
      var top = showAbove
        ? termRect.top - popupRect.height - HOVER_GAP
        : termRect.bottom + HOVER_GAP;

      if (showAbove && top < HOVER_VIEWPORT_PADDING && spaceBelow > spaceAbove) {
        showAbove = false;
        top = termRect.bottom + HOVER_GAP;
      }
      if (!showAbove && top + popupRect.height > viewportHeight - HOVER_VIEWPORT_PADDING && spaceAbove > spaceBelow) {
        showAbove = true;
        top = termRect.top - popupRect.height - HOVER_GAP;
      }

      var left = termRect.left + termRect.width / 2 - popupRect.width / 2;
      var maxLeft = Math.max(HOVER_VIEWPORT_PADDING, viewportWidth - popupRect.width - HOVER_VIEWPORT_PADDING);
      var maxTop = Math.max(HOVER_VIEWPORT_PADDING, viewportHeight - popupRect.height - HOVER_VIEWPORT_PADDING);
      left = clamp(left, HOVER_VIEWPORT_PADDING, maxLeft);
      top = clamp(top, HOVER_VIEWPORT_PADDING, maxTop);

      var arrowLeft = clamp(
        termRect.left + termRect.width / 2 - left,
        18,
        Math.max(18, popupRect.width - 18)
      );

      popupEl.style.left = String(left) + "px";
      popupEl.style.top = String(top) + "px";
      popupEl.style.setProperty("--md-hover-arrow-left", String(arrowLeft) + "px");
      popupEl.classList.toggle("is-above", showAbove);
      popupEl.classList.toggle("is-below", !showAbove);
    }

    function openForTerm(termEl) {
      if (!termEl) {
        return;
      }

      var hoverId = String(termEl.getAttribute("data-hover-id") || "").trim();
      if (!hoverId) {
        return;
      }

      var definitionEl = resolveDefinition(hoverId);
      if (!definitionEl) {
        return;
      }

      clearHideTimer();

      if (activeTermEl && activeTermEl !== termEl) {
        setTermActive(activeTermEl, false);
      }

      activeTermEl = termEl;
      setTermActive(activeTermEl, true);

      applyPopupSize(definitionEl);
      setPopupContent(definitionEl);

      popupEl.classList.remove("is-open");
      popupEl.style.visibility = "hidden";
      positionPopup();
      popupEl.style.visibility = "";
      popupEl.setAttribute("aria-hidden", "false");

      window.requestAnimationFrame(function () {
        popupEl.classList.add("is-open");
      });
    }

    function bindTerm(termEl) {
      if (!termEl || termEl.dataset.hoverBound === "1") {
        return;
      }

      termEl.dataset.hoverBound = "1";
      if (!termEl.hasAttribute("tabindex")) {
        termEl.setAttribute("tabindex", "0");
      }

      termEl.addEventListener("mouseenter", function () {
        openForTerm(termEl);
      });

      termEl.addEventListener("mouseleave", function (event) {
        if (event.relatedTarget && popupEl.contains(event.relatedTarget)) {
          clearHideTimer();
          return;
        }
        scheduleHide(HOVER_HIDE_DELAY);
      });

      termEl.addEventListener("focus", function () {
        openForTerm(termEl);
      });

      termEl.addEventListener("blur", function (event) {
        if (event.relatedTarget && popupEl.contains(event.relatedTarget)) {
          clearHideTimer();
          return;
        }
        scheduleHide(HOVER_HIDE_DELAY);
      });

      termEl.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          hideNow();
          termEl.blur();
          return;
        }
        if ((event.key === "Enter" || event.key === " ") && !popupEl.classList.contains("is-open")) {
          event.preventDefault();
          openForTerm(termEl);
        }
      });
    }

    function registerDefinitions(rootEl) {
      var defs = getNodesInScope(rootEl || document, ".md-hover-card-def[data-hover-id]");
      for (var i = 0; i < defs.length; i += 1) {
        var defEl = defs[i];
        var hoverId = String(defEl.getAttribute("data-hover-id") || "").trim();
        if (!hoverId) {
          continue;
        }
        definitions[hoverId] = defEl;
      }
    }

    function registerTerms(rootEl) {
      var terms = getNodesInScope(rootEl || document, ".md-hover-term[data-hover-id]");
      for (var i = 0; i < terms.length; i += 1) {
        bindTerm(terms[i]);
      }
    }

    function register(rootEl) {
      registerDefinitions(rootEl || document);
      registerTerms(rootEl || document);
    }

    popupEl.addEventListener("mouseenter", clearHideTimer);
    popupEl.addEventListener("mouseleave", function () {
      if (shouldHoldOpen()) {
        return;
      }
      scheduleHide(HOVER_HIDE_DELAY);
    });
    popupEl.addEventListener("mousedown", function () {
      holdByPointer = true;
      clearHideTimer();
    });
    popupEl.addEventListener("mouseup", function () {
      holdByPointer = false;
      if (!popupEl.matches(":hover") && (!activeTermEl || !activeTermEl.matches(":hover"))) {
        scheduleHide(90);
      }
    });
    popupEl.addEventListener("focusin", clearHideTimer);
    popupEl.addEventListener("focusout", function (event) {
      if (event.relatedTarget && popupEl.contains(event.relatedTarget)) {
        return;
      }
      if (event.relatedTarget && activeTermEl && activeTermEl.contains(event.relatedTarget)) {
        return;
      }
      scheduleHide(HOVER_HIDE_DELAY);
    });

    document.addEventListener("pointerdown", function (event) {
      if (!popupEl.classList.contains("is-open")) {
        return;
      }
      if (popupEl.contains(event.target)) {
        clearHideTimer();
        return;
      }
      if (activeTermEl && activeTermEl.contains(event.target)) {
        return;
      }
      hideNow();
    });

    window.addEventListener("mouseup", function () {
      if (!holdByPointer) {
        return;
      }
      holdByPointer = false;
      if (popupEl.classList.contains("is-open") && !popupEl.matches(":hover") && (!activeTermEl || !activeTermEl.matches(":hover"))) {
        scheduleHide(90);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        hideNow();
      }
    });

    window.addEventListener("scroll", function () {
      if (!popupEl.classList.contains("is-open")) {
        return;
      }
      positionPopup();
    }, { passive: true });

    window.addEventListener("resize", function () {
      if (!popupEl.classList.contains("is-open")) {
        return;
      }
      positionPopup();
    });

    return {
      register: register
    };
  }

  function initHoverCards(rootEl) {
    if (!hoverController) {
      hoverController = createHoverController();
    }
    hoverController.register(rootEl || document);
  }

  function handleResize() {
    pruneResizeItems();
    for (var i = 0; i < resizeItems.length; i += 1) {
      applyColumnTemplate(resizeItems[i]);
    }
  }

  function init() {
    initColumns(document);
    bindXrefs(document);
    initHoverCards(document);
    window.addEventListener("resize", handleResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
