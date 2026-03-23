(function () {
  "use strict";

  function getLanguageLabel(codeEl, preEl) {
    var explicitTitle =
      (preEl.dataset && preEl.dataset.codeTitle) ||
      (codeEl.dataset && codeEl.dataset.codeTitle) ||
      "";
    if (explicitTitle) {
      return String(explicitTitle).trim();
    }

    var classNames = ((codeEl.className || "") + " " + (preEl.className || "")).split(/\s+/);
    for (var i = 0; i < classNames.length; i += 1) {
      var className = classNames[i];
      if (!className) {
        continue;
      }
      if (className.indexOf("language-") === 0) {
        return className.slice("language-".length) || "code";
      }
    }
    return "code";
  }

  function getLineCount(text) {
    if (!text) {
      return 1;
    }
    var normalized = String(text).replace(/\r\n/g, "\n");
    if (normalized.endsWith("\n")) {
      normalized = normalized.slice(0, -1);
    }
    if (!normalized) {
      return 1;
    }
    return normalized.split("\n").length;
  }

  function copyText(text, buttonEl) {
    function setCopiedState() {
      var original = buttonEl.textContent;
      buttonEl.textContent = "Copied";
      window.setTimeout(function () {
        buttonEl.textContent = original;
      }, 1200);
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(setCopiedState).catch(function () {});
      return;
    }

    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "readonly");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      setCopiedState();
    } catch (_error) {
      // ignore copy failure
    }
    document.body.removeChild(area);
  }

  function createLineNumbersText(lineCount) {
    var lines = [];
    for (var i = 1; i <= lineCount; i += 1) {
      lines.push(String(i));
    }
    return lines.join("\n");
  }

  function buildCodeModule(preEl) {
    if (!preEl || preEl.dataset.codeModuleBound === "1") {
      return;
    }
    if (preEl.closest(".code-module")) {
      return;
    }

    var codeEl = preEl.querySelector("code");
    if (!codeEl) {
      return;
    }

    preEl.dataset.codeModuleBound = "1";

    var rawText = codeEl.textContent || "";
    var lineCount = getLineCount(rawText);
    var title = getLanguageLabel(codeEl, preEl);
    var digits = String(lineCount).length;

    var moduleEl = document.createElement("section");
    moduleEl.className = "code-module";
    moduleEl.style.setProperty("--code-line-digits", String(digits));

    var headerEl = document.createElement("div");
    headerEl.className = "code-module-header";

    var toggleEl = document.createElement("button");
    toggleEl.type = "button";
    toggleEl.className = "code-module-toggle";
    toggleEl.setAttribute("aria-expanded", "true");
    toggleEl.setAttribute("aria-label", "Collapse code");
    toggleEl.textContent = "▾";

    var titleEl = document.createElement("span");
    titleEl.className = "code-module-title";
    titleEl.textContent = title;

    var copyEl = document.createElement("button");
    copyEl.type = "button";
    copyEl.className = "code-module-copy";
    copyEl.textContent = "Copy";

    headerEl.appendChild(toggleEl);
    headerEl.appendChild(titleEl);
    headerEl.appendChild(copyEl);

    var bodyEl = document.createElement("div");
    bodyEl.className = "code-module-body";

    var gutterEl = document.createElement("pre");
    gutterEl.className = "code-module-gutter";
    gutterEl.setAttribute("aria-hidden", "true");
    gutterEl.textContent = createLineNumbersText(lineCount);

    var preWrapEl = document.createElement("pre");
    preWrapEl.className = "code-module-pre";

    codeEl.classList.add("code-module-code");
    preWrapEl.appendChild(codeEl);

    bodyEl.appendChild(gutterEl);
    bodyEl.appendChild(preWrapEl);

    moduleEl.appendChild(headerEl);
    moduleEl.appendChild(bodyEl);

    toggleEl.addEventListener("click", function (event) {
      event.stopPropagation();
      var collapsed = moduleEl.classList.toggle("is-collapsed");
      toggleEl.setAttribute("aria-expanded", String(!collapsed));
      toggleEl.setAttribute("aria-label", collapsed ? "Expand code" : "Collapse code");
      toggleEl.textContent = collapsed ? "▸" : "▾";
    });

    headerEl.addEventListener("click", function (event) {
      if (event.target === copyEl) {
        return;
      }
      toggleEl.click();
    });

    copyEl.addEventListener("click", function (event) {
      event.stopPropagation();
      copyText(rawText, copyEl);
    });

    preEl.replaceWith(moduleEl);
  }

  function initCodeBlocks() {
    var codeBlocks = document.querySelectorAll(".post-article pre");
    for (var i = 0; i < codeBlocks.length; i += 1) {
      buildCodeModule(codeBlocks[i]);
    }
  }

  window.CodeDisplayModule = {
    init: initCodeBlocks,
    refresh: initCodeBlocks
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCodeBlocks);
  } else {
    initCodeBlocks();
  }
})();
