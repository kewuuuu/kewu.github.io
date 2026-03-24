(function () {
  "use strict";

  var STORAGE_LEFT_WIDTH_KEY = "kewu:post-left-width";
  var STORAGE_RIGHT_WIDTH_KEY = "kewu:post-right-width";
  var STORAGE_LEFT_COLLAPSED_KEY = "kewu:post-left-collapsed";
  var STORAGE_RIGHT_COLLAPSED_KEY = "kewu:post-right-collapsed";
  var DEFAULT_LEFT_WIDTH = 280;
  var DEFAULT_RIGHT_WIDTH = 260;
  var LEFT_MIN_WIDTH = 170;
  var RIGHT_MIN_WIDTH = 170;
  var stateItems = [];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readNumber(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw == null) {
        return fallback;
      }
      var value = Number.parseFloat(raw);
      return Number.isFinite(value) ? value : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function readBool(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw == null) {
        return fallback;
      }
      return raw === "1";
    } catch (_error) {
      return fallback;
    }
  }

  function writeValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // ignore localStorage write failures
    }
  }

  function isPortraitRatio() {
    return window.innerHeight > window.innerWidth;
  }

  function maxWidthByViewport(ratio, minValue) {
    var viewport = Math.max(window.innerWidth || 0, 320);
    var result = Math.floor(viewport * ratio);
    return Math.max(result, minValue + 40);
  }

  function clampLeft(width) {
    return clamp(width, LEFT_MIN_WIDTH, maxWidthByViewport(0.45, LEFT_MIN_WIDTH));
  }

  function clampRight(width) {
    return clamp(width, RIGHT_MIN_WIDTH, maxWidthByViewport(0.4, RIGHT_MIN_WIDTH));
  }

  function updateGridTemplate(item) {
    var layoutEl = item.layoutEl;
    var hasToc = item.hasToc;
    var portrait = isPortraitRatio();
    var leftWidth = clampLeft(item.state.leftWidth);
    var rightWidth = clampRight(item.state.rightWidth);
    item.state.leftWidth = leftWidth;
    item.state.rightWidth = rightWidth;

    layoutEl.classList.toggle("is-portrait-ratio", portrait);
    layoutEl.classList.toggle("is-landscape-ratio", !portrait);
    layoutEl.classList.toggle("is-left-collapsed", item.state.leftCollapsed);
    layoutEl.classList.toggle("is-right-collapsed", item.state.rightCollapsed);

    layoutEl.style.setProperty("--post-left-width", String(leftWidth) + "px");
    layoutEl.style.setProperty("--post-right-width", String(rightWidth) + "px");

    var leftPart = item.state.leftCollapsed ? "0px" : String(leftWidth) + "px";
    var rightPart = item.state.rightCollapsed ? "0px" : String(rightWidth) + "px";
    var template;

    if (hasToc && !portrait) {
      template =
        leftPart +
        " var(--post-splitter-width) minmax(0,1fr) var(--post-splitter-width) " +
        rightPart;
    } else {
      template = "minmax(0,1fr) var(--post-splitter-width) " + rightPart;
    }
    layoutEl.style.setProperty("--post-grid-template", template);

    if (item.leftToggleEl) {
      item.leftToggleEl.setAttribute("aria-expanded", String(!item.state.leftCollapsed));
      item.leftToggleEl.setAttribute(
        "aria-label",
        item.state.leftCollapsed ? "Expand left section" : "Collapse left section"
      );
      item.leftToggleEl.textContent = item.state.leftCollapsed ? ">" : "<";
    }

    if (item.rightToggleEl) {
      item.rightToggleEl.setAttribute("aria-expanded", String(!item.state.rightCollapsed));
      item.rightToggleEl.setAttribute(
        "aria-label",
        item.state.rightCollapsed ? "Expand right sidebar" : "Collapse right sidebar"
      );
      item.rightToggleEl.textContent = item.state.rightCollapsed ? "<" : ">";
    }
  }

  function persistState(item) {
    writeValue(STORAGE_LEFT_WIDTH_KEY, String(item.state.leftWidth));
    writeValue(STORAGE_RIGHT_WIDTH_KEY, String(item.state.rightWidth));
    writeValue(STORAGE_LEFT_COLLAPSED_KEY, item.state.leftCollapsed ? "1" : "0");
    writeValue(STORAGE_RIGHT_COLLAPSED_KEY, item.state.rightCollapsed ? "1" : "0");
  }

  function startDrag(onMove) {
    document.body.classList.add("post-resizing");

    function handleMove(event) {
      onMove(event);
    }

    function handleUp() {
      document.body.classList.remove("post-resizing");
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  function wireSplitters(item) {
    if (item.leftToggleEl) {
      item.leftToggleEl.addEventListener("click", function (event) {
        event.stopPropagation();
        item.state.leftCollapsed = !item.state.leftCollapsed;
        updateGridTemplate(item);
        persistState(item);
      });
    }

    if (item.rightToggleEl) {
      item.rightToggleEl.addEventListener("click", function (event) {
        event.stopPropagation();
        item.state.rightCollapsed = !item.state.rightCollapsed;
        updateGridTemplate(item);
        persistState(item);
      });
    }

    if (item.leftSplitterEl) {
      item.leftSplitterEl.addEventListener("mousedown", function (event) {
        if (event.button !== 0 || event.target === item.leftToggleEl) {
          return;
        }
        if (!item.hasToc || isPortraitRatio()) {
          return;
        }
        event.preventDefault();

        if (item.state.leftCollapsed) {
          item.state.leftCollapsed = false;
          updateGridTemplate(item);
        }

        var startX = event.clientX;
        var startWidth = item.state.leftWidth;
        startDrag(function (moveEvent) {
          var deltaX = moveEvent.clientX - startX;
          item.state.leftWidth = clampLeft(startWidth + deltaX);
          updateGridTemplate(item);
          persistState(item);
        });
      });
    }

    if (item.rightSplitterEl) {
      item.rightSplitterEl.addEventListener("mousedown", function (event) {
        if (event.button !== 0 || event.target === item.rightToggleEl) {
          return;
        }
        event.preventDefault();

        if (item.state.rightCollapsed) {
          item.state.rightCollapsed = false;
          updateGridTemplate(item);
        }

        var startX = event.clientX;
        var startWidth = item.state.rightWidth;
        startDrag(function (moveEvent) {
          var deltaX = moveEvent.clientX - startX;
          item.state.rightWidth = clampRight(startWidth - deltaX);
          updateGridTemplate(item);
          persistState(item);
        });
      });
    }
  }

  function getTocItemLevel(itemEl) {
    var raw = itemEl.getAttribute("data-level");
    var level = Number.parseInt(raw || "0", 10);
    return Number.isFinite(level) ? level : 0;
  }

  function refreshTocVisibility(tocListEl) {
    var items = tocListEl.querySelectorAll(".post-toc-item");
    var collapsedStack = [];

    for (var i = 0; i < items.length; i += 1) {
      var itemEl = items[i];
      var level = getTocItemLevel(itemEl);

      while (collapsedStack.length > 0 && level <= collapsedStack[collapsedStack.length - 1]) {
        collapsedStack.pop();
      }

      var hidden = collapsedStack.length > 0;
      itemEl.classList.toggle("post-toc-item-hidden", hidden);

      if (!hidden && itemEl.getAttribute("data-collapsed") === "1") {
        collapsedStack.push(level);
      }
    }
  }

  function enhanceTocTree(tocListEl) {
    var items = Array.prototype.slice.call(tocListEl.querySelectorAll(".post-toc-item"));
    if (items.length === 0) {
      return;
    }

    for (var i = 0; i < items.length; i += 1) {
      var currentItem = items[i];
      var currentLevel = getTocItemLevel(currentItem);
      currentItem.setAttribute("data-collapsed", "0");

      var hasChildren = false;
      for (var j = i + 1; j < items.length; j += 1) {
        var nextLevel = getTocItemLevel(items[j]);
        if (nextLevel <= currentLevel) {
          break;
        }
        hasChildren = true;
      }

      var anchorEl = currentItem.querySelector("a");
      if (anchorEl && !anchorEl.classList.contains("post-toc-link")) {
        anchorEl.classList.add("post-toc-link");
      }

      if (!hasChildren) {
        var placeholder = currentItem.querySelector(".post-toc-toggle-btn");
        if (!placeholder) {
          placeholder = document.createElement("span");
          placeholder.className = "post-toc-toggle-btn";
          placeholder.setAttribute("aria-hidden", "true");
          placeholder.textContent = "▸";
          currentItem.insertBefore(placeholder, currentItem.firstChild);
        }
        continue;
      }

      currentItem.classList.add("has-children");
      var existingButton = currentItem.querySelector(".post-toc-toggle-btn");
      if (existingButton) {
        continue;
      }

      var toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "post-toc-toggle-btn";
      toggleButton.setAttribute("aria-expanded", "true");
      toggleButton.setAttribute("aria-label", "Collapse subheadings");
      toggleButton.textContent = "▾";

      toggleButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var buttonEl = event.currentTarget;
        var itemEl = buttonEl.parentElement;
        var collapsed = itemEl.getAttribute("data-collapsed") === "1";
        var nextCollapsed = !collapsed;

        itemEl.setAttribute("data-collapsed", nextCollapsed ? "1" : "0");
        buttonEl.setAttribute("aria-expanded", String(!nextCollapsed));
        buttonEl.setAttribute(
          "aria-label",
          nextCollapsed ? "Expand subheadings" : "Collapse subheadings"
        );
        buttonEl.textContent = nextCollapsed ? "▸" : "▾";

        refreshTocVisibility(tocListEl);
      });

      currentItem.insertBefore(toggleButton, currentItem.firstChild);
    }

    refreshTocVisibility(tocListEl);
  }

  function initLayout(layoutEl) {
    var item = {
      layoutEl: layoutEl,
      hasToc: layoutEl.classList.contains("has-toc"),
      leftSplitterEl: layoutEl.querySelector(".post-splitter-left"),
      rightSplitterEl: layoutEl.querySelector(".post-splitter-right"),
      leftToggleEl: layoutEl.querySelector(".post-toggle-left"),
      rightToggleEl: layoutEl.querySelector(".post-toggle-right"),
      state: {
        leftWidth: readNumber(STORAGE_LEFT_WIDTH_KEY, DEFAULT_LEFT_WIDTH),
        rightWidth: readNumber(STORAGE_RIGHT_WIDTH_KEY, DEFAULT_RIGHT_WIDTH),
        leftCollapsed: readBool(STORAGE_LEFT_COLLAPSED_KEY, false),
        rightCollapsed: readBool(STORAGE_RIGHT_COLLAPSED_KEY, false)
      }
    };

    wireSplitters(item);
    var tocLists = layoutEl.querySelectorAll(".post-toc-list");
    for (var i = 0; i < tocLists.length; i += 1) {
      enhanceTocTree(tocLists[i]);
    }
    updateGridTemplate(item);
    stateItems.push(item);
  }

  function initContentTree(treeEl) {
    if (!treeEl || treeEl.dataset.contentTreeBound === "1") {
      return;
    }

    treeEl.dataset.contentTreeBound = "1";

    var buttons = treeEl.querySelectorAll(".content-tree-toggle");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        var buttonEl = event.currentTarget;
        var itemEl = buttonEl.parentElement;
        if (!itemEl) {
          return;
        }

        var collapsed = itemEl.classList.toggle("is-collapsed");
        buttonEl.setAttribute("aria-expanded", String(!collapsed));
        buttonEl.setAttribute(
          "aria-label",
          collapsed ? "Expand children" : "Collapse children"
        );
      });
    }
  }

  function handleResize() {
    for (var i = 0; i < stateItems.length; i += 1) {
      updateGridTemplate(stateItems[i]);
    }
  }

  function init() {
    var layouts = document.querySelectorAll(".post-layout");
    for (var i = 0; i < layouts.length; i += 1) {
      initLayout(layouts[i]);
    }

    var contentTrees = document.querySelectorAll(".content-tree-panel");
    for (var j = 0; j < contentTrees.length; j += 1) {
      initContentTree(contentTrees[j]);
    }

    window.addEventListener("resize", handleResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
