(function () {
  "use strict";

  var ALIGNMENTS = new Set(["left", "center", "right"]);
  var SIZE_MODES = new Set(["responsive", "fixed", "scale", "responsive-scale"]);
  var viewerState = {
    isOpen: false,
    zoom: 1,
    minZoom: 0.2,
    maxZoom: 8,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    suppressCloseClick: false
  };

  var overlayEl = null;
  var stageEl = null;
  var viewerImageEl = null;
  var closeButtonEl = null;
  var activeTriggerImage = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isNumericString(value) {
    return /^-?\d+(\.\d+)?$/.test(value);
  }

  function normalizeCssSize(rawValue, fallbackValue) {
    if (rawValue == null || rawValue === "") {
      return fallbackValue;
    }

    var value = String(rawValue).trim();
    if (!value) {
      return fallbackValue;
    }

    if (isNumericString(value)) {
      return value + "px";
    }

    return value;
  }

  function parseAlignment(rawAlignment) {
    var value = String(rawAlignment || "center").trim().toLowerCase();
    return ALIGNMENTS.has(value) ? value : "center";
  }

  function normalizeMode(rawMode) {
    var value = String(rawMode || "responsive-scale").trim().toLowerCase().replace(/_/g, "-");
    if (value === "default") {
      return "responsive-scale";
    }
    if (value === "responsivescale") {
      return "responsive-scale";
    }
    return SIZE_MODES.has(value) ? value : "responsive-scale";
  }

  function parseFactor(rawValue, fallbackValue) {
    var value = Number.parseFloat(rawValue);
    if (!Number.isFinite(value)) {
      return fallbackValue;
    }
    return value;
  }

  function parseResponsiveRatio(rawValue, fallbackValue) {
    if (rawValue == null || rawValue === "") {
      return fallbackValue;
    }

    var value = String(rawValue).trim();
    if (!value) {
      return fallbackValue;
    }

    if (value.endsWith("%")) {
      var percentValue = Number.parseFloat(value.slice(0, -1));
      if (Number.isFinite(percentValue)) {
        return percentValue / 100;
      }
      return fallbackValue;
    }

    var numericValue = Number.parseFloat(value);
    if (!Number.isFinite(numericValue)) {
      return fallbackValue;
    }

    if (numericValue > 1) {
      return numericValue / 100;
    }

    return numericValue;
  }

  function getDataOption(imageEl, wrapperEl, optionName) {
    if (imageEl.dataset && imageEl.dataset[optionName]) {
      return imageEl.dataset[optionName];
    }
    if (wrapperEl && wrapperEl.dataset && wrapperEl.dataset[optionName]) {
      return wrapperEl.dataset[optionName];
    }
    return "";
  }

  function prepareWrapper(imageEl) {
    var parentEl = imageEl.parentElement;
    var wrapperEl;

    if (parentEl && parentEl.tagName === "P") {
      wrapperEl = parentEl;
    } else if (parentEl && parentEl.classList.contains("image-module")) {
      wrapperEl = parentEl;
    } else {
      wrapperEl = document.createElement("figure");
      wrapperEl.className = "image-module";
      parentEl.insertBefore(wrapperEl, imageEl);
      wrapperEl.appendChild(imageEl);
    }

    wrapperEl.classList.add("image-module");
    wrapperEl.classList.remove("image-align-left", "image-align-center", "image-align-right");

    return wrapperEl;
  }

  function applyImageSize(imageEl, wrapperEl) {
    var mode = normalizeMode(getDataOption(imageEl, wrapperEl, "imageSizeMode"));
    var width = getDataOption(imageEl, wrapperEl, "imageWidth");
    var height = getDataOption(imageEl, wrapperEl, "imageHeight");
    var scale = parseFactor(getDataOption(imageEl, wrapperEl, "imageScale"), 1);
    var responsiveScaleRaw =
      getDataOption(imageEl, wrapperEl, "imageResponsiveScale") ||
      getDataOption(imageEl, wrapperEl, "imageRatio");
    var responsiveScale = clamp(parseResponsiveRatio(responsiveScaleRaw, 0.5), 0.05, 1);

    imageEl.style.width = "";
    imageEl.style.height = "";
    imageEl.style.maxWidth = "";

    if (mode === "fixed") {
      imageEl.style.width = normalizeCssSize(width, "auto");
      imageEl.style.height = normalizeCssSize(height, "auto");
      imageEl.style.maxWidth = "none";
      return;
    }

    if (mode === "scale") {
      var safeScale = clamp(scale, 0.05, 10);
      if (imageEl.complete && imageEl.naturalWidth > 0) {
        imageEl.style.width = String(Math.round(imageEl.naturalWidth * safeScale)) + "px";
      } else {
        imageEl.addEventListener(
          "load",
          function () {
            imageEl.style.width = String(Math.round(imageEl.naturalWidth * safeScale)) + "px";
          },
          { once: true }
        );
      }
      imageEl.style.height = "auto";
      imageEl.style.maxWidth = "100%";
      return;
    }

    if (mode === "responsive") {
      imageEl.style.width = normalizeCssSize(width, "100%");
      imageEl.style.height = "auto";
      imageEl.style.maxWidth = "100%";
      return;
    }

    imageEl.style.width = String((responsiveScale * 100).toFixed(4)).replace(/\.?0+$/, "") + "%";
    imageEl.style.height = "auto";
    imageEl.style.maxWidth = "100%";
  }

  function renderViewerTransform() {
    if (!viewerImageEl) {
      return;
    }
    viewerImageEl.style.transform =
      "translate(" +
      String(viewerState.offsetX) +
      "px, " +
      String(viewerState.offsetY) +
      "px) scale(" +
      String(viewerState.zoom) +
      ")";
  }

  function closeViewer() {
    if (!overlayEl || !viewerState.isOpen) {
      return;
    }

    overlayEl.classList.remove("is-open");
    document.body.classList.remove("image-viewer-open");
    viewerState.isOpen = false;
    viewerState.zoom = 1;
    viewerState.offsetX = 0;
    viewerState.offsetY = 0;
    viewerState.dragging = false;
    viewerState.hasMoved = false;
    viewerState.suppressCloseClick = false;
    viewerImageEl.classList.remove("is-dragging");
    viewerImageEl.removeAttribute("src");
    viewerImageEl.alt = "";

    if (activeTriggerImage) {
      activeTriggerImage.focus({ preventScroll: true });
    }
    activeTriggerImage = null;
  }

  function openViewerFromImage(imageEl) {
    ensureViewer();

    viewerImageEl.src = imageEl.currentSrc || imageEl.src;
    viewerImageEl.alt = imageEl.alt || "";
    viewerState.isOpen = true;
    viewerState.zoom = 1;
    viewerState.offsetX = 0;
    viewerState.offsetY = 0;
    viewerState.dragging = false;
    viewerState.hasMoved = false;
    viewerState.suppressCloseClick = false;
    activeTriggerImage = imageEl;

    renderViewerTransform();
    overlayEl.classList.add("is-open");
    document.body.classList.add("image-viewer-open");
  }

  function handleViewerWheel(event) {
    if (!viewerState.isOpen) {
      return;
    }

    event.preventDefault();
    var direction = event.deltaY < 0 ? 1 : -1;
    var factor = direction > 0 ? 1.1 : 0.9;
    var nextZoom = clamp(viewerState.zoom * factor, viewerState.minZoom, viewerState.maxZoom);
    viewerState.zoom = nextZoom;
    if (viewerState.zoom <= 1) {
      viewerState.offsetX = 0;
      viewerState.offsetY = 0;
    }
    renderViewerTransform();
  }

  function beginDrag(event) {
    if (!viewerState.isOpen || event.button !== 0) {
      return;
    }

    event.preventDefault();
    viewerState.dragging = true;
    viewerState.hasMoved = false;
    viewerState.startX = event.clientX;
    viewerState.startY = event.clientY;
    viewerState.startOffsetX = viewerState.offsetX;
    viewerState.startOffsetY = viewerState.offsetY;
    viewerImageEl.classList.add("is-dragging");
  }

  function handleDrag(event) {
    if (!viewerState.dragging) {
      return;
    }

    var deltaX = event.clientX - viewerState.startX;
    var deltaY = event.clientY - viewerState.startY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      viewerState.hasMoved = true;
    }
    viewerState.offsetX = viewerState.startOffsetX + deltaX;
    viewerState.offsetY = viewerState.startOffsetY + deltaY;
    renderViewerTransform();
  }

  function endDrag() {
    if (!viewerState.dragging) {
      return;
    }

    viewerState.dragging = false;
    viewerImageEl.classList.remove("is-dragging");
    if (viewerState.hasMoved) {
      viewerState.suppressCloseClick = true;
      window.setTimeout(function () {
        viewerState.suppressCloseClick = false;
      }, 0);
    }
  }

  function ensureViewer() {
    if (overlayEl) {
      return;
    }

    overlayEl = document.createElement("div");
    overlayEl.className = "image-viewer-overlay";
    overlayEl.setAttribute("aria-hidden", "true");

    stageEl = document.createElement("div");
    stageEl.className = "image-viewer-stage";

    viewerImageEl = document.createElement("img");
    viewerImageEl.className = "image-viewer-image";
    viewerImageEl.alt = "";
    viewerImageEl.setAttribute("draggable", "false");

    closeButtonEl = document.createElement("button");
    closeButtonEl.type = "button";
    closeButtonEl.className = "image-viewer-close";
    closeButtonEl.setAttribute("aria-label", "Close image preview");
    closeButtonEl.textContent = "x";

    stageEl.appendChild(viewerImageEl);
    overlayEl.appendChild(stageEl);
    overlayEl.appendChild(closeButtonEl);
    document.body.appendChild(overlayEl);

    closeButtonEl.addEventListener("click", function (event) {
      event.stopPropagation();
      closeViewer();
    });

    overlayEl.addEventListener("click", function (event) {
      if (event.target === overlayEl) {
        closeViewer();
      }
    });

    stageEl.addEventListener("click", function (event) {
      if (event.target !== stageEl) {
        return;
      }
      if (viewerState.suppressCloseClick) {
        return;
      }
      closeViewer();
    });

    viewerImageEl.addEventListener("click", function (event) {
      event.stopPropagation();
    });

    viewerImageEl.addEventListener("wheel", handleViewerWheel, { passive: false });
    viewerImageEl.addEventListener("mousedown", beginDrag);
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && viewerState.isOpen) {
        closeViewer();
      }
    });
  }

  function bindImage(imageEl, wrapperEl) {
    if (imageEl.dataset.imageModuleBound === "1") {
      return;
    }

    imageEl.dataset.imageModuleBound = "1";
    imageEl.tabIndex = 0;
    imageEl.setAttribute("role", "button");
    imageEl.setAttribute("aria-label", imageEl.alt || "Open image preview");

    imageEl.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openViewerFromImage(imageEl);
    });

    imageEl.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      openViewerFromImage(imageEl);
    });

    var alignment = parseAlignment(getDataOption(imageEl, wrapperEl, "imageAlign"));
    wrapperEl.classList.add("image-align-" + alignment);
    applyImageSize(imageEl, wrapperEl);
  }

  function initImageModule() {
    var articleImages = document.querySelectorAll("main img:not([data-image-module-ignore])");
    for (var i = 0; i < articleImages.length; i += 1) {
      var imageEl = articleImages[i];
      if (imageEl.closest(".image-viewer-overlay")) {
        continue;
      }
      var wrapperEl = prepareWrapper(imageEl);
      bindImage(imageEl, wrapperEl);
    }
  }

  window.ImageDisplayModule = {
    init: initImageModule,
    refresh: initImageModule,
    open: openViewerFromImage
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initImageModule);
  } else {
    initImageModule();
  }
})();
