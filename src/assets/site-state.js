(function () {
  "use strict";

  var SCROLL_PREFIX = "kewu:scroll:";
  var READ_POSTS_KEY = "kewu:read-posts";
  var saveTimer = 0;

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

    var links = document.querySelectorAll(".page-home .content-tree-item-post .content-tree-link");
    for (var i = 0; i < links.length; i += 1) {
      links[i].addEventListener("click", function (event) {
        var href = event.currentTarget.getAttribute("href") || "";
        markVisited(normalizePathFromHref(href));
      });
    }

    applyReadState();
  }

  function init() {
    restoreScrollPosition();
    bindReadTracking();

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
