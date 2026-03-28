(function () {
  "use strict";

  var COLUMN_KEY_PREFIX = "kewu:columns:";
  var COLUMN_MIN_WIDTH = 160;
  var resizeItems = [];

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

  function applyColumnTemplate(item) {
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

  function initColumns() {
    var containers = document.querySelectorAll(".md-columns[data-columns-default]");
    for (var i = 0; i < containers.length; i += 1) {
      var containerEl = containers[i];
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

  function bindXrefs() {
    var xrefs = document.querySelectorAll(".md-xref[href^='#']");
    for (var i = 0; i < xrefs.length; i += 1) {
      xrefs[i].addEventListener("click", function (event) {
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

    window.addEventListener("hashchange", highlightHashTarget);
    highlightHashTarget();
  }

  function handleResize() {
    for (var i = 0; i < resizeItems.length; i += 1) {
      applyColumnTemplate(resizeItems[i]);
    }
  }

  function init() {
    initColumns();
    bindXrefs();
    window.addEventListener("resize", handleResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
