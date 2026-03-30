(function () {
  "use strict";

  var SCROLL_PREFIX = "kewu:scroll:";
  var READ_POSTS_KEY = "kewu:read-posts";
  var HOME_TREE_PREFS_KEY = "kewu:home-tree-prefs";
  var TREE_SORT_FIELDS = ["default", "title", "date"];
  var HOME_TREE_DEFAULT_PREFS = {
    viewMode: "tree",
    sortField: "default",
    sortDirection: "asc"
  };

  var saveTimer = 0;
  var readTrackingBound = false;
  var homeTreeState = null;

  function getPageKey() {
    return window.location.pathname + window.location.search;
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // ignore write failures
    }
  }

  function saveScrollPosition() {
    writeStorage(SCROLL_PREFIX + getPageKey(), String(window.scrollY || window.pageYOffset || 0));
  }

  function scheduleScrollSave() {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(function () {
      saveScrollPosition();
      saveTimer = 0;
    }, 120);
  }

  function restoreScrollPosition() {
    var raw = readStorage(SCROLL_PREFIX + getPageKey());
    var targetY = Number.parseFloat(raw || "");
    if (!Number.isFinite(targetY) || targetY <= 0) {
      return;
    }

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    function applyRestore() {
      window.scrollTo(0, targetY);
    }

    window.requestAnimationFrame(function () {
      applyRestore();
      window.requestAnimationFrame(applyRestore);
      window.setTimeout(applyRestore, 120);
    });
  }

  function readVisitedPaths() {
    var raw = readStorage(READ_POSTS_KEY);
    if (!raw) {
      return [];
    }

    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeVisitedPaths(paths) {
    writeStorage(READ_POSTS_KEY, JSON.stringify(paths));
  }

  function normalizePathFromHref(href) {
    try {
      return new URL(href, window.location.href).pathname;
    } catch (_error) {
      return "";
    }
  }

  function markVisited(pathname) {
    if (!pathname) {
      return;
    }

    var visited = readVisitedPaths();
    if (visited.indexOf(pathname) !== -1) {
      return;
    }

    visited.push(pathname);
    writeVisitedPaths(visited);
  }

  function applyReadState() {
    var visited = readVisitedPaths();
    var items = document.querySelectorAll(".page-home .content-tree-item-post");

    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var link = item.querySelector(".content-tree-link");
      if (!link) {
        continue;
      }

      var path = normalizePathFromHref(link.getAttribute("href") || "");
      var isRead = visited.indexOf(path) !== -1;
      item.classList.toggle("is-read", isRead);
      item.classList.toggle("is-unread", !isRead);
    }
  }

  function bindReadTracking() {
    if (document.querySelector(".page-main.page-post")) {
      markVisited(window.location.pathname);
    }

    if (!readTrackingBound) {
      document.addEventListener("click", function (event) {
        var target = event.target;
        if (!target || !target.closest) {
          return;
        }
        var link = target.closest(".page-home .content-tree-item-post .content-tree-link");
        if (!link) {
          return;
        }
        var href = link.getAttribute("href") || "";
        markVisited(normalizePathFromHref(href));
      });
      readTrackingBound = true;
    }

    applyReadState();
  }

  function parseJson(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function normalizeViewMode(value) {
    return value === "flat" ? "flat" : "tree";
  }

  function normalizeSortField(value) {
    if (TREE_SORT_FIELDS.indexOf(value) !== -1) {
      return value;
    }
    return HOME_TREE_DEFAULT_PREFS.sortField;
  }

  function normalizeSortDirection(value) {
    return value === "desc" ? "desc" : "asc";
  }

  function normalizeTreePrefs(rawValue) {
    var raw = rawValue || {};
    return {
      viewMode: normalizeViewMode(raw.viewMode),
      sortField: normalizeSortField(raw.sortField),
      sortDirection: normalizeSortDirection(raw.sortDirection)
    };
  }

  function readHomeTreePrefs() {
    var raw = readStorage(HOME_TREE_PREFS_KEY);
    if (!raw) {
      return Object.assign({}, HOME_TREE_DEFAULT_PREFS);
    }
    return normalizeTreePrefs(parseJson(raw, {}));
  }

  function writeHomeTreePrefs(prefs) {
    writeStorage(HOME_TREE_PREFS_KEY, JSON.stringify(normalizeTreePrefs(prefs)));
  }

  function textFromElement(element) {
    return element ? String(element.textContent || "").trim() : "";
  }

  function parseDateToMs(value) {
    var timestamp = Date.parse(String(value || "").trim());
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
  }

  function parseNumber(value, fallbackValue) {
    var numberValue = Number.parseFloat(String(value || ""));
    return Number.isFinite(numberValue) ? numberValue : fallbackValue;
  }

  function getDirectChildByClass(parentEl, className) {
    if (!parentEl) {
      return null;
    }
    var current = parentEl.firstElementChild;
    while (current) {
      if (current.classList.contains(className)) {
        return current;
      }
      current = current.nextElementSibling;
    }
    return null;
  }

  function getDirectTreeItems(listEl) {
    var result = [];
    if (!listEl) {
      return result;
    }
    var current = listEl.firstElementChild;
    while (current) {
      if (current.classList.contains("content-tree-item")) {
        result.push(current);
      }
      current = current.nextElementSibling;
    }
    return result;
  }

  function getNodeKind(itemEl) {
    var value = String((itemEl && itemEl.dataset && itemEl.dataset.nodeKind) || "").trim();
    if (value === "category" || value === "post") {
      return value;
    }
    return itemEl && itemEl.classList.contains("content-tree-item-category") ? "category" : "post";
  }

  function getNodeTitle(itemEl) {
    var datasetTitle = String((itemEl && itemEl.dataset && itemEl.dataset.nodeTitle) || "").trim();
    if (datasetTitle) {
      return datasetTitle;
    }
    var link = itemEl ? itemEl.querySelector(".content-tree-link") : null;
    if (link) {
      return textFromElement(link);
    }
    var label = itemEl ? itemEl.querySelector(".content-tree-label") : null;
    return textFromElement(label);
  }

  function getNodeOrder(itemEl) {
    return parseNumber(itemEl && itemEl.dataset ? itemEl.dataset.nodeOrder : "", 0);
  }

  function getNodeDateMs(itemEl) {
    var fromDataset = parseDateToMs(itemEl && itemEl.dataset ? itemEl.dataset.nodeDate : "");
    if (Number.isFinite(fromDataset)) {
      return fromDataset;
    }
    var meta = itemEl ? itemEl.querySelector(".content-tree-meta") : null;
    return parseDateToMs(textFromElement(meta));
  }

  function compareText(leftValue, rightValue) {
    return String(leftValue || "").localeCompare(String(rightValue || ""), "zh-CN");
  }

  function compareNumber(leftValue, rightValue) {
    if (leftValue === rightValue) {
      return 0;
    }
    return leftValue < rightValue ? -1 : 1;
  }

  function getKindRank(kind) {
    return kind === "category" ? 0 : 1;
  }

  function getNaturalTreeComparison(leftItem, rightItem, sortField) {
    var leftKind = getNodeKind(leftItem);
    var rightKind = getNodeKind(rightItem);
    var kindComparison = compareNumber(getKindRank(leftKind), getKindRank(rightKind));
    if (kindComparison !== 0) {
      return kindComparison;
    }

    var leftTitle = getNodeTitle(leftItem);
    var rightTitle = getNodeTitle(rightItem);

    if (sortField === "title") {
      var titleOnlyComparison = compareText(leftTitle, rightTitle);
      if (titleOnlyComparison !== 0) {
        return titleOnlyComparison;
      }
      return compareNumber(getNodeDateMs(rightItem), getNodeDateMs(leftItem));
    }

    if (sortField === "date") {
      var dateComparison = compareNumber(getNodeDateMs(rightItem), getNodeDateMs(leftItem));
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return compareText(leftTitle, rightTitle);
    }

    var orderComparison = compareNumber(getNodeOrder(leftItem), getNodeOrder(rightItem));
    if (orderComparison !== 0) {
      return orderComparison;
    }

    if (leftKind === "post") {
      var fallbackDateComparison = compareNumber(getNodeDateMs(rightItem), getNodeDateMs(leftItem));
      if (fallbackDateComparison !== 0) {
        return fallbackDateComparison;
      }
    }

    return compareText(leftTitle, rightTitle);
  }

  function applySortDirection(baseComparison, direction) {
    return direction === "desc" ? -baseComparison : baseComparison;
  }

  function sortTreeListInPlace(listEl, prefs) {
    var items = getDirectTreeItems(listEl);

    for (var i = 0; i < items.length; i += 1) {
      var childList = getDirectChildByClass(items[i], "content-tree-list");
      if (childList) {
        sortTreeListInPlace(childList, prefs);
      }
    }

    items.sort(function (leftItem, rightItem) {
      var naturalComparison = getNaturalTreeComparison(leftItem, rightItem, prefs.sortField);
      return applySortDirection(naturalComparison, prefs.sortDirection);
    });

    for (var j = 0; j < items.length; j += 1) {
      listEl.appendChild(items[j]);
    }
  }

  function collectFlatPostsFromList(listEl, parentTitles, output) {
    var items = getDirectTreeItems(listEl);

    for (var i = 0; i < items.length; i += 1) {
      var itemEl = items[i];
      var kind = getNodeKind(itemEl);
      var title = getNodeTitle(itemEl);
      var entryEl = getDirectChildByClass(itemEl, "content-tree-entry");
      var linkEl = entryEl ? entryEl.querySelector(".content-tree-link") : null;
      var descriptionEl = entryEl ? entryEl.querySelector(".content-tree-description") : null;
      var metaEl = entryEl ? entryEl.querySelector(".content-tree-meta") : null;

      if (kind === "post" && linkEl) {
        output.push({
          title: title,
          href: String(linkEl.getAttribute("href") || ""),
          description: textFromElement(descriptionEl),
          dateLabel: textFromElement(metaEl),
          dateMs: getNodeDateMs(itemEl),
          order: getNodeOrder(itemEl),
          pathTitles: parentTitles.slice()
        });
      }

      var childList = getDirectChildByClass(itemEl, "content-tree-list");
      if (childList) {
        collectFlatPostsFromList(childList, parentTitles.concat([title]), output);
      }
    }
  }

  function compareFlatPostRecords(leftItem, rightItem, prefs) {
    var comparison = 0;

    if (prefs.sortField === "title") {
      comparison = compareText(leftItem.title, rightItem.title);
      if (comparison === 0) {
        comparison = compareNumber(rightItem.dateMs, leftItem.dateMs);
      }
    } else if (prefs.sortField === "date") {
      comparison = compareNumber(rightItem.dateMs, leftItem.dateMs);
      if (comparison === 0) {
        comparison = compareText(leftItem.title, rightItem.title);
      }
    } else {
      comparison = compareNumber(leftItem.order, rightItem.order);
      if (comparison === 0) {
        comparison = compareNumber(rightItem.dateMs, leftItem.dateMs);
      }
      if (comparison === 0) {
        comparison = compareText(leftItem.title, rightItem.title);
      }
    }

    return applySortDirection(comparison, prefs.sortDirection);
  }

  function sortFlatPosts(posts, prefs) {
    if (prefs.sortField === "default") {
      return;
    }
    posts.sort(function (leftItem, rightItem) {
      return compareFlatPostRecords(leftItem, rightItem, prefs);
    });
  }

  function createKindIcon(iconSrc) {
    var iconWrapper = document.createElement("span");
    iconWrapper.className = "content-tree-kind-icon";
    iconWrapper.setAttribute("aria-hidden", "true");

    if (iconSrc) {
      var iconImage = document.createElement("img");
      iconImage.src = iconSrc;
      iconImage.alt = "";
      iconImage.width = 16;
      iconImage.height = 16;
      iconWrapper.appendChild(iconImage);
    } else {
      iconWrapper.textContent = "•";
    }

    return iconWrapper;
  }

  function renderFlatList(state) {
    var posts = [];
    collectFlatPostsFromList(state.treeRootEl, [], posts);
    sortFlatPosts(posts, state.prefs);

    state.flatListEl.textContent = "";

    if (posts.length === 0) {
      return;
    }

    for (var i = 0; i < posts.length; i += 1) {
      var post = posts[i];
      var itemEl = document.createElement("li");
      itemEl.className = "content-tree-item content-tree-item-post content-tree-flat-item";
      itemEl.dataset.nodeKind = "post";
      itemEl.dataset.nodeTitle = post.title;
      itemEl.dataset.nodeOrder = String(post.order);

      var placeholderEl = document.createElement("span");
      placeholderEl.className = "content-tree-toggle-placeholder";
      placeholderEl.setAttribute("aria-hidden", "true");
      itemEl.appendChild(placeholderEl);

      var entryEl = document.createElement("div");
      entryEl.className = "content-tree-entry";
      itemEl.appendChild(entryEl);

      var titleRowEl = document.createElement("div");
      titleRowEl.className = "content-tree-title-row content-tree-title-row-post";
      entryEl.appendChild(titleRowEl);
      titleRowEl.appendChild(createKindIcon(state.postIconSrc));

      var linkEl = document.createElement("a");
      linkEl.className = "content-tree-link";
      linkEl.href = post.href;
      linkEl.textContent = post.title;
      titleRowEl.appendChild(linkEl);

      if (post.pathTitles.length > 0) {
        var pathEl = document.createElement("p");
        pathEl.className = "content-tree-flat-path";
        pathEl.textContent = post.pathTitles.join(" / ");
        entryEl.appendChild(pathEl);
      }

      if (post.description) {
        var descriptionEl = document.createElement("p");
        descriptionEl.className = "content-tree-description";
        descriptionEl.textContent = post.description;
        entryEl.appendChild(descriptionEl);
      }

      if (post.dateLabel) {
        var metaEl = document.createElement("p");
        metaEl.className = "content-tree-meta";
        metaEl.textContent = post.dateLabel;
        entryEl.appendChild(metaEl);
      }

      state.flatListEl.appendChild(itemEl);
    }
  }

  function getViewModeDisplay(viewMode) {
    return viewMode === "flat"
      ? { icon: "☰", label: "顺序显示" }
      : { icon: "◫", label: "树形显示" };
  }

  function getSortFieldDisplay(sortField) {
    if (sortField === "title") {
      return { icon: "A", label: "按标题排序" };
    }
    if (sortField === "date") {
      return { icon: "◷", label: "按时间排序" };
    }
    return { icon: "≣", label: "默认排序" };
  }

  function getSortDirectionDisplay(sortDirection) {
    return sortDirection === "desc"
      ? { icon: "↓", label: "倒序" }
      : { icon: "↑", label: "正序" };
  }

  function updateToolbarButton(buttonEl, display, isActive) {
    if (!buttonEl) {
      return;
    }
    buttonEl.textContent = display.icon;
    buttonEl.dataset.tooltip = display.label;
    buttonEl.setAttribute("aria-label", display.label);
    buttonEl.setAttribute("aria-pressed", isActive ? "true" : "false");
    buttonEl.classList.toggle("is-active", isActive);
  }

  function updateHomeTreeToolbar(state) {
    var toolbarEl = state.toolbarEl;
    var viewButton = toolbarEl.querySelector("[data-tree-action='toggle-view']");
    var sortFieldButton = toolbarEl.querySelector("[data-tree-action='toggle-sort-field']");
    var sortDirectionButton = toolbarEl.querySelector("[data-tree-action='toggle-sort-direction']");

    updateToolbarButton(
      viewButton,
      getViewModeDisplay(state.prefs.viewMode),
      state.prefs.viewMode !== HOME_TREE_DEFAULT_PREFS.viewMode
    );
    updateToolbarButton(
      sortFieldButton,
      getSortFieldDisplay(state.prefs.sortField),
      state.prefs.sortField !== HOME_TREE_DEFAULT_PREFS.sortField
    );
    updateToolbarButton(
      sortDirectionButton,
      getSortDirectionDisplay(state.prefs.sortDirection),
      state.prefs.sortDirection !== HOME_TREE_DEFAULT_PREFS.sortDirection
    );
  }

  function applyHomeTreePreferences(state) {
    sortTreeListInPlace(state.treeRootEl, state.prefs);
    renderFlatList(state);

    var isFlatMode = state.prefs.viewMode === "flat";
    state.treeRootEl.hidden = isFlatMode;
    state.flatListEl.hidden = !isFlatMode;
    state.panelEl.classList.toggle("is-flat-mode", isFlatMode);

    updateHomeTreeToolbar(state);
    writeHomeTreePrefs(state.prefs);
    applyReadState();
  }

  function getNextSortField(currentField) {
    var index = TREE_SORT_FIELDS.indexOf(currentField);
    if (index === -1) {
      return TREE_SORT_FIELDS[0];
    }
    return TREE_SORT_FIELDS[(index + 1) % TREE_SORT_FIELDS.length];
  }

  function bindHomeTreeToolbar(state) {
    if (state.toolbarEl.dataset.bound === "1") {
      return;
    }
    state.toolbarEl.dataset.bound = "1";

    state.toolbarEl.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) {
        return;
      }

      var button = target.closest("[data-tree-action]");
      if (!button) {
        return;
      }

      var action = String(button.getAttribute("data-tree-action") || "");
      if (action === "toggle-view") {
        state.prefs.viewMode = state.prefs.viewMode === "tree" ? "flat" : "tree";
      } else if (action === "toggle-sort-field") {
        state.prefs.sortField = getNextSortField(state.prefs.sortField);
      } else if (action === "toggle-sort-direction") {
        state.prefs.sortDirection = state.prefs.sortDirection === "asc" ? "desc" : "asc";
      } else {
        return;
      }

      applyHomeTreePreferences(state);
    });
  }

  function initHomeTreeControls() {
    if (homeTreeState) {
      return;
    }

    var panelEl = document.querySelector(".page-home .content-tree-panel-home");
    if (!panelEl) {
      return;
    }

    var toolbarEl = panelEl.querySelector(".content-tree-toolbar");
    var treeRootEl = getDirectChildByClass(panelEl, "content-tree-list");
    if (!toolbarEl || !treeRootEl) {
      return;
    }

    var flatListEl = document.createElement("ol");
    flatListEl.className = "content-tree-list content-tree-flat-list";
    flatListEl.hidden = true;
    treeRootEl.insertAdjacentElement("afterend", flatListEl);

    var postIconEl = panelEl.querySelector(".content-tree-item-post .content-tree-kind-icon img");
    homeTreeState = {
      panelEl: panelEl,
      toolbarEl: toolbarEl,
      treeRootEl: treeRootEl,
      flatListEl: flatListEl,
      postIconSrc: postIconEl ? String(postIconEl.getAttribute("src") || "") : "",
      prefs: readHomeTreePrefs()
    };

    bindHomeTreeToolbar(homeTreeState);
    applyHomeTreePreferences(homeTreeState);
  }

  function init() {
    restoreScrollPosition();
    bindReadTracking();
    initHomeTreeControls();

    window.addEventListener("scroll", scheduleScrollSave, { passive: true });
    window.addEventListener("pagehide", saveScrollPosition);
    window.addEventListener("beforeunload", saveScrollPosition);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
