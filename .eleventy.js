module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("pathToRoot", function (urlValue) {
    var normalizedUrl = String(urlValue || "/");
    var segments = normalizedUrl.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "";
    }
    return "../".repeat(segments.length);
  });

  eleventyConfig.addFilter("extractToc", function (htmlContent, minLevel, maxLevel) {
    var html = String(htmlContent || "");
    var min = Number.isFinite(Number(minLevel)) ? Number(minLevel) : 2;
    var max = Number.isFinite(Number(maxLevel)) ? Number(maxLevel) : 3;
    var headingPattern = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
    var items = [];
    var match;
    var levelStack = [];

    function decodeHtml(rawText) {
      return String(rawText || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    while ((match = headingPattern.exec(html)) !== null) {
      var level = Number(match[1]);
      if (level < min || level > max) {
        continue;
      }

      var attrs = match[2] || "";
      var inner = match[3] || "";
      var idMatch = attrs.match(/\sid="([^"]+)"/i);
      if (!idMatch || !idMatch[1]) {
        continue;
      }

      var plainText = decodeHtml(inner.replace(/<[^>]+>/g, "").trim());
      if (!plainText) {
        continue;
      }

      while (levelStack.length > 0 && level <= levelStack[levelStack.length - 1]) {
        levelStack.pop();
      }
      var depth = levelStack.length;
      levelStack.push(level);

      items.push({
        id: idMatch[1],
        text: plainText,
        level: level,
        depth: depth
      });
    }

    return items;
  });

  eleventyConfig.amendLibrary("md", function (mdLib) {
    var ALIGNMENTS = new Set(["left", "center", "right"]);
    var MODES = new Set(["responsive", "fixed", "scale", "responsive-scale"]);

    function normalizeAlignment(value) {
      var v = String(value || "").trim().toLowerCase();
      return ALIGNMENTS.has(v) ? v : "center";
    }

    function normalizeMode(value) {
      var v = String(value || "").trim().toLowerCase().replace(/_/g, "-");
      if (v === "default" || v === "responsivescale") {
        return "responsive-scale";
      }
      return MODES.has(v) ? v : "responsive-scale";
    }

    function normalizeSizeValue(value) {
      var v = String(value || "").trim();
      if (!v) {
        return "";
      }
      if (/^-?\d+(\.\d+)?$/.test(v)) {
        return v;
      }
      if (/^-?\d+(\.\d+)?(px|%|vw|vh|rem|em)$/.test(v)) {
        return v;
      }
      return "";
    }

    function normalizeScaleValue(value) {
      var v = Number.parseFloat(value);
      if (!Number.isFinite(v)) {
        return "";
      }
      if (v <= 0) {
        return "";
      }
      return String(v);
    }

    function normalizeRatioValue(value) {
      var v = String(value || "").trim();
      if (!v) {
        return "";
      }
      if (/^-?\d+(\.\d+)?%$/.test(v)) {
        return v;
      }
      if (/^-?\d+(\.\d+)?$/.test(v)) {
        return v;
      }
      return "";
    }

    // 支持：![alt](src "img:align=right;mode=fixed;width=320;height=240")
    function parseImageMeta(titleValue) {
      var defaults = {
        align: "center",
        mode: "responsive-scale",
        responsiveScale: "50%",
        width: "",
        height: "",
        scale: ""
      };

      if (!titleValue) {
        return defaults;
      }

      var raw = String(titleValue).trim();
      if (!raw.toLowerCase().startsWith("img:")) {
        return defaults;
      }

      var payload = raw.slice(4).trim();
      if (!payload) {
        return defaults;
      }

      var parts = payload.split(";");
      for (var i = 0; i < parts.length; i += 1) {
        var part = parts[i].trim();
        if (!part) {
          continue;
        }
        var separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          continue;
        }
        var key = part.slice(0, separatorIndex).trim().toLowerCase();
        var value = part.slice(separatorIndex + 1).trim();

        if (key === "align") {
          defaults.align = normalizeAlignment(value);
          continue;
        }
        if (key === "mode" || key === "size" || key === "image-size-mode") {
          defaults.mode = normalizeMode(value);
          continue;
        }
        if (key === "width" || key === "w") {
          defaults.width = normalizeSizeValue(value);
          continue;
        }
        if (key === "height" || key === "h") {
          defaults.height = normalizeSizeValue(value);
          continue;
        }
        if (key === "scale") {
          defaults.scale = normalizeScaleValue(value);
          continue;
        }
        if (key === "ratio" || key === "responsive-scale" || key === "responsiveScale") {
          defaults.responsiveScale = normalizeRatioValue(value) || defaults.responsiveScale;
        }
      }

      return defaults;
    }

    function removeAttr(token, attrName) {
      var index = token.attrIndex(attrName);
      if (index >= 0) {
        token.attrs.splice(index, 1);
      }
    }

    function setAttrIfValue(token, key, value) {
      if (!value) {
        return;
      }
      token.attrSet(key, value);
    }

    function slugifyHeading(text) {
      var input = String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      return input || "section";
    }

    function getInlineText(inlineToken) {
      if (!inlineToken || inlineToken.type !== "inline") {
        return "";
      }
      if (!inlineToken.children || inlineToken.children.length === 0) {
        return String(inlineToken.content || "");
      }
      var pieces = [];
      for (var i = 0; i < inlineToken.children.length; i += 1) {
        var child = inlineToken.children[i];
        if (child.type === "text" || child.type === "code_inline") {
          pieces.push(child.content || "");
        }
      }
      return pieces.join("").trim();
    }

    var defaultImageRender =
      mdLib.renderer.rules.image ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    var defaultHeadingOpen =
      mdLib.renderer.rules.heading_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    function isImageOnlyParagraph(tokens, idx) {
      if (!tokens[idx] || tokens[idx].type !== "paragraph_open") {
        return false;
      }
      var inlineToken = tokens[idx + 1];
      var closeToken = tokens[idx + 2];
      if (!inlineToken || inlineToken.type !== "inline") {
        return false;
      }
      if (!closeToken || closeToken.type !== "paragraph_close") {
        return false;
      }
      var children = inlineToken.children || [];
      return children.length === 1 && children[0].type === "image";
    }

    function getImageMetaFromParagraph(tokens, idx) {
      var inlineToken = tokens[idx + 1];
      var imageToken = inlineToken.children[0];
      return {
        align: normalizeAlignment(imageToken.attrGet("data-image-align")),
        mode: normalizeMode(imageToken.attrGet("data-image-size-mode")),
        responsiveScale: normalizeRatioValue(imageToken.attrGet("data-image-responsive-scale")) || "50%",
        width: normalizeSizeValue(imageToken.attrGet("data-image-width")),
        height: normalizeSizeValue(imageToken.attrGet("data-image-height")),
        scale: normalizeScaleValue(imageToken.attrGet("data-image-scale"))
      };
    }

    var defaultParagraphOpen =
      mdLib.renderer.rules.paragraph_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    var defaultParagraphClose =
      mdLib.renderer.rules.paragraph_close ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    mdLib.renderer.rules.paragraph_open = function (tokens, idx, options, env, self) {
      if (isImageOnlyParagraph(tokens, idx)) {
        var meta = getImageMetaFromParagraph(tokens, idx);
        var styleParts = ['--image-responsive-scale:' + meta.responsiveScale];
        if (meta.width) {
          styleParts.push('--image-width:' + meta.width);
        }
        if (meta.height) {
          styleParts.push('--image-height:' + meta.height);
        }
        if (meta.scale) {
          styleParts.push('--image-scale:' + meta.scale);
        }
        return (
          '<figure class="image-module image-align-' +
          meta.align +
          '" data-image-align="' +
          meta.align +
          '" data-image-size-mode="' +
          meta.mode +
          '" data-image-responsive-scale="' +
          meta.responsiveScale +
          '" style="' +
          styleParts.join(";") +
          '">'
        );
      }
      return defaultParagraphOpen(tokens, idx, options, env, self);
    };

    mdLib.renderer.rules.paragraph_close = function (tokens, idx, options, env, self) {
      if (tokens[idx - 2] && isImageOnlyParagraph(tokens, idx - 2)) {
        return "</figure>\n";
      }
      return defaultParagraphClose(tokens, idx, options, env, self);
    };

    mdLib.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
      var token = tokens[idx];
      if (token.attrGet("id")) {
        return defaultHeadingOpen(tokens, idx, options, env, self);
      }

      var inlineToken = tokens[idx + 1];
      var headingText = getInlineText(inlineToken);
      var baseId = slugifyHeading(headingText);

      if (!env.__headingSlugCount) {
        env.__headingSlugCount = {};
      }
      var current = env.__headingSlugCount[baseId] || 0;
      env.__headingSlugCount[baseId] = current + 1;

      var finalId = current === 0 ? baseId : baseId + "-" + String(current + 1);
      token.attrSet("id", finalId);
      return defaultHeadingOpen(tokens, idx, options, env, self);
    };

    mdLib.renderer.rules.image = function (tokens, idx, options, env, self) {
      var token = tokens[idx];
      var meta = parseImageMeta(token.attrGet("title"));

      // title 仅用于传递 img: 配置，避免原样出现在 tooltip
      if (String(token.attrGet("title") || "").trim().toLowerCase().startsWith("img:")) {
        removeAttr(token, "title");
      }

      token.attrSet("loading", "lazy");
      token.attrSet("decoding", "async");
      token.attrSet("data-image-align", meta.align);
      token.attrSet("data-image-size-mode", meta.mode);
      setAttrIfValue(token, "data-image-responsive-scale", meta.responsiveScale);
      setAttrIfValue(token, "data-image-width", meta.width);
      setAttrIfValue(token, "data-image-height", meta.height);
      setAttrIfValue(token, "data-image-scale", meta.scale);

      return defaultImageRender(tokens, idx, options, env, self);
    };
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("src/posts/**/assets");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "docs"
    }
  };
};
