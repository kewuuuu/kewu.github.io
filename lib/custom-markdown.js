"use strict";

var INLINE_TAGS = new Set(["span", "mark", "u", "sup", "sub", "anchor", "xref", "cell", "math"]);
var ALIGNMENTS = new Set(["left", "center", "right", "justify"]);
var LIST_MARKERS = new Set([
  "disc",
  "circle",
  "square",
  "decimal",
  "decimal-leading-zero",
  "lower-alpha",
  "upper-alpha",
  "lower-roman",
  "upper-roman",
  "lower-greek"
]);
var MATH_COMMAND_MAP = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ϵ",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  varpi: "ϖ",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "ϕ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
  cdot: "·",
  times: "×",
  pm: "±",
  mp: "∓",
  neq: "≠",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  approx: "≈",
  equiv: "≡",
  to: "→",
  rightarrow: "→",
  Rightarrow: "⇒",
  leftarrow: "←",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  infty: "∞",
  sum: "∑",
  prod: "∏",
  int: "∫",
  oint: "∮",
  partial: "∂",
  nabla: "∇",
  forall: "∀",
  exists: "∃",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  supset: "⊃",
  supseteq: "⊇",
  cup: "∪",
  cap: "∩",
  degree: "°",
  ldots: "…",
  cdots: "⋯"
};
var MATH_FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "log",
  "ln",
  "exp",
  "lim",
  "max",
  "min",
  "arg",
  "det",
  "dim",
  "mod"
]);

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripQuotes(value) {
  var raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function splitArgs(raw) {
  var input = String(raw || "");
  var result = [];
  var current = "";
  var quote = "";

  for (var i = 0; i < input.length; i += 1) {
    var char = input.charAt(i);
    if (quote) {
      current += char;
      if (char === quote && input.charAt(i - 1) !== "\\") {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        result.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function parseAttributes(raw) {
  var attrs = {};
  var tokens = splitArgs(raw);

  for (var i = 0; i < tokens.length; i += 1) {
    var token = tokens[i];
    var separatorIndex = token.indexOf("=");
    if (separatorIndex === -1) {
      attrs[token.toLowerCase()] = true;
      continue;
    }

    var key = token.slice(0, separatorIndex).trim().toLowerCase();
    var value = stripQuotes(token.slice(separatorIndex + 1).trim());
    if (!key) {
      continue;
    }
    attrs[key] = value;
  }

  return attrs;
}

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeClassNames(value) {
  var pieces = String(value || "").trim().split(/\s+/);
  var result = [];

  for (var i = 0; i < pieces.length; i += 1) {
    var name = pieces[i].replace(/[^\w-]/g, "");
    if (!name) {
      continue;
    }
    if (result.indexOf(name) === -1) {
      result.push(name);
    }
  }

  return result.join(" ");
}

function sanitizeColor(value) {
  var clean = String(value || "").trim();
  if (!clean) {
    return "";
  }
  if (/^#[0-9a-f]{3,8}$/i.test(clean)) {
    return clean;
  }
  if (/^(rgb|rgba|hsl|hsla)\([^()]+\)$/i.test(clean)) {
    return clean;
  }
  if (/^[a-z-]{3,32}$/i.test(clean)) {
    return clean.toLowerCase();
  }
  if (/^var\(--[\w-]+\)$/i.test(clean)) {
    return clean;
  }
  return "";
}

function sanitizeCssLength(value, allowUnitless) {
  var clean = String(value || "").trim();
  if (!clean) {
    return "";
  }
  if (allowUnitless && /^-?\d+(\.\d+)?$/.test(clean)) {
    return clean;
  }
  if (/^-?\d+(\.\d+)?(px|r?em|%|vh|vw|ch|ex|cm|mm|in|pt|pc)$/.test(clean)) {
    return clean;
  }
  return "";
}

function sanitizeGap(value) {
  return sanitizeCssLength(value, false) || "18px";
}

function sanitizeFontFamily(value) {
  var clean = String(value || "").trim();
  if (!clean) {
    return "";
  }
  if (/^[\w\u4e00-\u9fa5 ,\"'/-]+$/.test(clean)) {
    return clean;
  }
  return "";
}

function sanitizeAlignment(value) {
  var clean = String(value || "").trim().toLowerCase();
  return ALIGNMENTS.has(clean) ? clean : "";
}

function sanitizeListMarker(value) {
  var clean = String(value || "").trim().toLowerCase();
  return LIST_MARKERS.has(clean) ? clean : "";
}

function sanitizeText(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function sanitizeWeight(value) {
  var clean = String(value || "").trim();
  if (!clean) {
    return "";
  }
  if (/^(normal|bold|bolder|lighter)$/i.test(clean)) {
    return clean.toLowerCase();
  }
  if (/^[1-9]00$/.test(clean)) {
    return clean;
  }
  return "";
}

function sanitizeRatios(rawValue, count) {
  var pieces = String(rawValue || "")
    .split(",")
    .map(function (item) {
      var value = Number.parseFloat(item.trim());
      return Number.isFinite(value) && value > 0 ? value : null;
    })
    .filter(Boolean);

  if (pieces.length === 0) {
    pieces = new Array(count).fill(1);
  }

  while (pieces.length < count) {
    pieces.push(1);
  }

  if (pieces.length > count) {
    pieces = pieces.slice(0, count);
  }

  return pieces;
}

function addStyle(styles, propertyName, value) {
  if (value) {
    styles.push(propertyName + ":" + value);
  }
}

function addClassName(classes, value) {
  if (!value) {
    return;
  }
  var parts = String(value).split(/\s+/);
  for (var i = 0; i < parts.length; i += 1) {
    var part = parts[i];
    if (part && classes.indexOf(part) === -1) {
      classes.push(part);
    }
  }
}

function renderAttributes(attrs) {
  var keys = Object.keys(attrs || {});
  var parts = [];

  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    var value = attrs[key];
    if (value == null || value === "") {
      continue;
    }
    parts.push(key + '="' + escapeHtml(value) + '"');
  }

  return parts.length ? " " + parts.join(" ") : "";
}

function buildInlinePresentation(attrs, baseClasses) {
  var classes = (baseClasses || []).slice();
  var styles = [];
  var fontWeight = sanitizeWeight(attrs.weight);

  if (attrs.bold === true && !fontWeight) {
    fontWeight = "700";
  }

  addStyle(styles, "color", sanitizeColor(attrs.color || attrs.text));
  addStyle(styles, "background", sanitizeColor(attrs.bg || attrs.background));
  addStyle(styles, "font-size", sanitizeCssLength(attrs.size, false));
  addStyle(styles, "font-family", sanitizeFontFamily(attrs.font));
  addStyle(styles, "font-weight", fontWeight);

  if (sanitizeColor(attrs.highlight)) {
    addStyle(styles, "--md-highlight", sanitizeColor(attrs.highlight));
    addClassName(classes, "is-highlighted");
  }
  if (attrs.underline === true) {
    addClassName(classes, "is-underlined");
  }
  if (attrs.strike === true) {
    addClassName(classes, "is-struck");
  }

  addClassName(classes, sanitizeClassNames(attrs.class));

  return {
    className: classes.join(" "),
    style: styles.join(";")
  };
}

function buildBlockPresentation(attrs, baseClass) {
  var classes = [baseClass];
  var styles = [];
  var borderColor = sanitizeColor(attrs.border);

  addStyle(styles, "color", sanitizeColor(attrs.color || attrs.text));
  addStyle(styles, "background", sanitizeColor(attrs.bg || attrs.background));
  addStyle(styles, "font-size", sanitizeCssLength(attrs.size, false));
  addStyle(styles, "line-height", sanitizeCssLength(attrs.line, true));
  addStyle(styles, "text-indent", sanitizeCssLength(attrs.indent, true));
  addStyle(styles, "font-family", sanitizeFontFamily(attrs.font));
  addStyle(styles, "text-align", sanitizeAlignment(attrs.align));
  addStyle(styles, "border-radius", sanitizeCssLength(attrs.radius, false));
  addStyle(styles, "padding", sanitizeCssLength(attrs.padding, false));

  if (borderColor) {
    addStyle(styles, "border", "1px solid " + borderColor);
  }
  if (attrs.shadow === true) {
    addClassName(classes, "has-shadow");
  }

  addClassName(classes, sanitizeClassNames(attrs.class));

  return {
    id: sanitizeId(attrs.id),
    className: classes.join(" "),
    style: styles.join(";"),
    listMarker: sanitizeListMarker(attrs.marker || attrs.list || attrs["list-marker"])
  };
}

function nextGeneratedId(env, prefix) {
  if (!env.__customMarkdownIds) {
    env.__customMarkdownIds = {};
  }
  var value = env.__customMarkdownIds[prefix] || 0;
  env.__customMarkdownIds[prefix] = value + 1;
  return prefix + "-" + String(value + 1);
}

function parseDirectiveLine(rawLine) {
  var line = String(rawLine || "").trim();
  var match = line.match(/^:::\s*([a-z-]+)(?:\s+(.*))?$/i);
  if (!match) {
    return null;
  }
  return {
    name: match[1].toLowerCase(),
    attrs: parseAttributes(match[2] || "")
  };
}

function getLineText(state, lineNumber) {
  var start = state.bMarks[lineNumber] + state.tShift[lineNumber];
  return state.src.slice(start, state.eMarks[lineNumber]);
}

function renderBlockWrapper(tagName, attrs, innerHtml, extraAttrs) {
  var renderedAttrs = {
    class: attrs.className,
    style: attrs.style
  };

  if (attrs.id) {
    renderedAttrs.id = attrs.id;
  }
  if (attrs.listMarker) {
    renderedAttrs["data-list-marker"] = attrs.listMarker;
    renderedAttrs.style = renderedAttrs.style
      ? renderedAttrs.style + ";--md-list-marker:" + attrs.listMarker
      : "--md-list-marker:" + attrs.listMarker;
  }

  var keys = Object.keys(extraAttrs || {});
  for (var i = 0; i < keys.length; i += 1) {
    renderedAttrs[keys[i]] = extraAttrs[keys[i]];
  }

  return "<" + tagName + renderAttributes(renderedAttrs) + ">" + innerHtml + "</" + tagName + ">";
}

function renderInlineTag(md, env, tagName, attrs, innerRaw) {
  var tagAttrs = {};
  var innerHtml;
  var presentation;
  var idValue;

  if (tagName === "math") {
    return renderMath(innerRaw, false);
  }

  if (tagName === "xref") {
    idValue = sanitizeId(attrs.to || attrs.target || attrs.href);
    if (!idValue) {
      return md.renderInline(innerRaw, env);
    }
    innerHtml = md.renderInline(innerRaw, env) || escapeHtml("#" + idValue);
    return '<a class="md-xref" href="#' + escapeHtml(idValue) + '" data-xref-target="' + escapeHtml(idValue) + '">' + innerHtml + "</a>";
  }

  if (tagName === "anchor") {
    innerHtml = md.renderInline(innerRaw, env);
    idValue = sanitizeId(attrs.id) || sanitizeId(innerRaw) || nextGeneratedId(env, "anchor");
    presentation = buildInlinePresentation(attrs, ["md-inline", "md-anchor-target"]);
    tagAttrs = {
      id: idValue,
      class: presentation.className,
      style: presentation.style
    };
    return "<span" + renderAttributes(tagAttrs) + ">" + innerHtml + "</span>";
  }

  if (tagName === "mark") {
    attrs = Object.assign({}, attrs, { highlight: attrs.highlight || "#fff3a3" });
  }
  if (tagName === "u") {
    attrs = Object.assign({}, attrs, { underline: true });
  }

  innerHtml = md.renderInline(innerRaw, env);
  presentation = buildInlinePresentation(attrs, ["md-inline"]);
  tagAttrs = {
    class: presentation.className,
    style: presentation.style
  };

  if (tagName === "sup" || tagName === "sub") {
    return "<" + tagName + renderAttributes(tagAttrs) + ">" + innerHtml + "</" + tagName + ">";
  }

  if (tagName === "cell") {
    tagAttrs.class = tagAttrs.class ? tagAttrs.class + " md-cell-fill" : "md-cell-fill";
  }

  return "<span" + renderAttributes(tagAttrs) + ">" + innerHtml + "</span>";
}

function isValidOpenTagAt(source, lowerSource, index, tagName) {
  if (index < 0 || lowerSource.slice(index + 1, index + 1 + tagName.length) !== tagName) {
    return false;
  }
  var after = source.charAt(index + 1 + tagName.length);
  return after === "]" || /\s/.test(after);
}

function findMatchingInlineTag(source, tagName, fromIndex) {
  var lowerSource = source.toLowerCase();
  var depth = 1;
  var position = fromIndex;
  var openNeedle = "[" + tagName;
  var closeNeedle = "[/" + tagName + "]";

  while (position < source.length) {
    var nextOpen = lowerSource.indexOf(openNeedle, position);
    while (nextOpen !== -1 && !isValidOpenTagAt(source, lowerSource, nextOpen, tagName)) {
      nextOpen = lowerSource.indexOf(openNeedle, nextOpen + 1);
    }

    var nextClose = lowerSource.indexOf(closeNeedle, position);
    if (nextClose === -1) {
      return null;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      position = nextOpen + openNeedle.length;
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return { start: nextClose, end: nextClose + closeNeedle.length };
    }
    position = nextClose + closeNeedle.length;
  }

  return null;
}

function customInlineTagRule(state, silent) {
  var source = state.src;
  var start = state.pos;

  if (source.charAt(start) !== "[" || source.charAt(start + 1) === "/") {
    return false;
  }

  var closeBracketIndex = source.indexOf("]", start + 1);
  if (closeBracketIndex === -1) {
    return false;
  }

  var head = source.slice(start + 1, closeBracketIndex);
  var tagName = head.split(/\s+/, 1)[0].toLowerCase();
  if (!INLINE_TAGS.has(tagName) || !/^[a-z-]+$/.test(tagName)) {
    return false;
  }

  var closeInfo = findMatchingInlineTag(source, tagName, closeBracketIndex + 1);
  if (!closeInfo) {
    return false;
  }

  if (!silent) {
    var token = state.push("html_inline", "", 0);
    token.content = renderInlineTag(
      state.md,
      state.env,
      tagName,
      parseAttributes(head.slice(tagName.length).trim()),
      source.slice(closeBracketIndex + 1, closeInfo.start)
    );
  }

  state.pos = closeInfo.end;
  return true;
}

function renderStyledBlock(md, env, attrs, rawContent) {
  var presentation = buildBlockPresentation(attrs, "md-block");
  return renderBlockWrapper("section", presentation, md.render(rawContent, env));
}

function renderDetailsBlock(md, env, attrs, rawContent) {
  var presentation = buildBlockPresentation(attrs, "md-details");
  var summaryHtml = md.renderInline(sanitizeText(attrs.title || attrs.summary || "折叠内容"), env);
  var bodyHtml = '<summary class="md-details__summary">' + summaryHtml + '</summary><div class="md-details__body">' + md.render(rawContent, env) + "</div>";
  return renderBlockWrapper("details", presentation, bodyHtml, {
    open: attrs.open === true ? "open" : ""
  });
}

function renderColumnsBlock(md, env, attrs, segments) {
  var ratios = sanitizeRatios(attrs.ratios || attrs.weights || attrs.cols, segments.length);
  var className = sanitizeClassNames(attrs.class);
  var classes = "md-columns" + (className ? " " + className : "");
  var columnsId = sanitizeId(attrs.id) || nextGeneratedId(env, "columns");
  var parts = [];

  for (var i = 0; i < segments.length; i += 1) {
    parts.push('<div class="md-columns__column" data-column-index="' + String(i) + '">' + md.render(segments[i], env) + "</div>");
    if (i < segments.length - 1) {
      parts.push('<div class="md-columns__splitter" role="separator" aria-orientation="vertical" data-split-index="' + String(i) + '"><span class="md-columns__splitter-handle" aria-hidden="true"></span></div>');
    }
  }

  return '<section class="' + escapeHtml(classes) + '" data-columns-id="' + escapeHtml(columnsId) + '" data-columns-default="' + escapeHtml(ratios.join(",")) + '" style="--md-columns-gap:' + escapeHtml(sanitizeGap(attrs.gap)) + '">' + parts.join("") + "</section>";
}

function scanSimpleDirective(state, startLine, endLine, directiveName) {
  var depth = 0;
  for (var lineNumber = startLine + 1; lineNumber < endLine; lineNumber += 1) {
    var info = parseDirectiveLine(getLineText(state, lineNumber));
    if (!info) {
      continue;
    }
    if (info.name === directiveName) {
      depth += 1;
      continue;
    }
    if (info.name === "end" + directiveName) {
      if (depth === 0) {
        return lineNumber;
      }
      depth -= 1;
    }
  }
  return -1;
}

function scanColumnsDirective(state, startLine, endLine) {
  var depth = 0;
  var segmentStart = startLine + 1;
  var segments = [];

  for (var lineNumber = startLine + 1; lineNumber < endLine; lineNumber += 1) {
    var info = parseDirectiveLine(getLineText(state, lineNumber));
    if (!info) {
      continue;
    }

    if (info.name === "columns") {
      depth += 1;
      continue;
    }

    if (info.name === "endcolumns") {
      if (depth === 0) {
        segments.push(state.getLines(segmentStart, lineNumber, 0, false));
        return { endLine: lineNumber, segments: segments };
      }
      depth -= 1;
      continue;
    }

    if (info.name === "column" && depth === 0) {
      segments.push(state.getLines(segmentStart, lineNumber, 0, false));
      segmentStart = lineNumber + 1;
    }
  }

  return null;
}

function customDirectiveBlockRule(state, startLine, endLine, silent) {
  var info = parseDirectiveLine(getLineText(state, startLine));
  if (!info) {
    return false;
  }

  if (info.name === "columns") {
    var columnsResult = scanColumnsDirective(state, startLine, endLine);
    if (!columnsResult || columnsResult.segments.length === 0) {
      return false;
    }
    if (silent) {
      return true;
    }
    var columnToken = state.push("html_block", "", 0);
    columnToken.content = renderColumnsBlock(state.md, state.env, info.attrs, columnsResult.segments) + "\n";
    columnToken.map = [startLine, columnsResult.endLine + 1];
    state.line = columnsResult.endLine + 1;
    return true;
  }

  if (info.name !== "block" && info.name !== "details") {
    return false;
  }

  var closeLine = scanSimpleDirective(state, startLine, endLine, info.name);
  if (closeLine === -1) {
    return false;
  }
  if (silent) {
    return true;
  }

  var content = state.getLines(startLine + 1, closeLine, 0, false);
  var renderedHtml = info.name === "block"
    ? renderStyledBlock(state.md, state.env, info.attrs, content)
    : renderDetailsBlock(state.md, state.env, info.attrs, content);
  var token = state.push("html_block", "", 0);
  token.content = renderedHtml + "\n";
  token.map = [startLine, closeLine + 1];
  state.line = closeLine + 1;
  return true;
}

function readMathBlock(state, startLine, endLine) {
  var firstLine = getLineText(state, startLine).trim();
  if (!firstLine.startsWith("$$")) {
    return null;
  }

  if (firstLine !== "$$" && firstLine.endsWith("$$") && firstLine.length > 4) {
    return { endLine: startLine, content: firstLine.slice(2, -2).trim() };
  }

  var lines = [];
  for (var lineNumber = startLine + 1; lineNumber < endLine; lineNumber += 1) {
    if (getLineText(state, lineNumber).trim() === "$$") {
      return { endLine: lineNumber, content: lines.join("\n").trim() };
    }
    lines.push(getLineText(state, lineNumber));
  }

  return null;
}

function tokenizeMath(tex) {
  var tokens = [];
  var input = String(tex || "");
  var position = 0;

  while (position < input.length) {
    var char = input.charAt(position);

    if (char === "\\") {
      var commandMatch = input.slice(position + 1).match(/^[A-Za-z]+/);
      if (commandMatch) {
        tokens.push({ type: "command", value: commandMatch[0] });
        position += commandMatch[0].length + 1;
        continue;
      }
      if (position + 1 < input.length) {
        tokens.push({ type: "command", value: input.charAt(position + 1) });
        position += 2;
        continue;
      }
    }

    if (char === "{" || char === "}" || char === "^" || char === "_") {
      tokens.push({ type: char, value: char });
      position += 1;
      continue;
    }

    if (/\s/.test(char)) {
      var whitespaceMatch = input.slice(position).match(/^\s+/);
      tokens.push({ type: "space", value: whitespaceMatch[0] });
      position += whitespaceMatch[0].length;
      continue;
    }

    var numberMatch = input.slice(position).match(/^[0-9]+(?:\.[0-9]+)?/);
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[0] });
      position += numberMatch[0].length;
      continue;
    }

    var textMatch = input.slice(position).match(/^[A-Za-z]+/);
    if (textMatch) {
      tokens.push({ type: "identifier", value: textMatch[0] });
      position += textMatch[0].length;
      continue;
    }

    tokens.push({ type: "symbol", value: char });
    position += 1;
  }

  return tokens;
}

function parseMath(tokens) {
  var position = 0;

  function peek() {
    return tokens[position] || null;
  }

  function consume() {
    var token = peek();
    if (token) {
      position += 1;
    }
    return token;
  }

  function parseExpression(stopAtBrace) {
    var parts = [];
    while (position < tokens.length) {
      if (stopAtBrace && peek() && peek().type === "}") {
        break;
      }
      parts.push(parseAtomWithScripts());
    }
    return parts.join("");
  }

  function parseGroup() {
    if (peek() && peek().type === "{") {
      consume();
      var body = parseExpression(true);
      if (peek() && peek().type === "}") {
        consume();
      }
      return body || '<span class="md-math-empty"></span>';
    }
    return parseAtomWithScripts();
  }

  function renderMathToken(token) {
    if (!token) {
      return "";
    }
    if (token.type === "number") {
      return '<span class="md-math-num">' + escapeHtml(token.value) + "</span>";
    }
    if (token.type === "identifier") {
      return '<span class="md-math-id">' + escapeHtml(token.value) + "</span>";
    }
    if (token.type === "space") {
      return '<span class="md-math-space"></span>';
    }
    if (token.type === "symbol") {
      return '<span class="md-math-symbol">' + escapeHtml(token.value) + "</span>";
    }
    if (token.type === "{") {
      position -= 1;
      return parseGroup();
    }
    if (token.type !== "command") {
      return escapeHtml(token.value);
    }

    if (token.value === "frac") {
      return '<span class="md-math-frac"><span class="md-math-frac__num">' + parseGroup() + '</span><span class="md-math-frac__den">' + parseGroup() + "</span></span>";
    }
    if (token.value === "sqrt") {
      return '<span class="md-math-sqrt"><span class="md-math-sqrt__sign">√</span><span class="md-math-sqrt__body">' + parseGroup() + "</span></span>";
    }
    if (token.value === "text" || token.value === "mathrm" || token.value === "mathbf" || token.value === "mathit") {
      var className = "md-math-text";
      if (token.value === "mathrm") {
        className += " is-roman";
      }
      if (token.value === "mathbf") {
        className += " is-bold";
      }
      if (token.value === "mathit") {
        className += " is-italic";
      }
      return '<span class="' + className + '">' + parseGroup() + "</span>";
    }
    if (token.value === "left" || token.value === "right") {
      return renderMathToken(consume());
    }
    if (MATH_COMMAND_MAP[token.value]) {
      return '<span class="md-math-symbol">' + escapeHtml(MATH_COMMAND_MAP[token.value]) + "</span>";
    }
    if (MATH_FUNCTIONS.has(token.value)) {
      return '<span class="md-math-fn">' + escapeHtml(token.value) + "</span>";
    }
    return '<span class="md-math-command">\\' + escapeHtml(token.value) + "</span>";
  }

  function parseAtom() {
    return renderMathToken(consume());
  }

  function parseAtomWithScripts() {
    var base = parseAtom();
    var superscript = "";
    var subscript = "";

    while (peek() && (peek().type === "^" || peek().type === "_")) {
      var type = consume().type;
      var content = parseGroup();
      if (type === "^") {
        superscript = content;
      } else {
        subscript = content;
      }
    }

    if (!superscript && !subscript) {
      return base;
    }

    return '<span class="md-math-script"><span class="md-math-script__base">' + base + '</span><span class="md-math-script__stack">' + (superscript ? '<span class="md-math-script__sup">' + superscript + "</span>" : "") + (subscript ? '<span class="md-math-script__sub">' + subscript + "</span>" : "") + "</span></span>";
  }

  return parseExpression(false);
}

function renderMath(tex, displayMode) {
  var clean = sanitizeText(tex);
  if (!clean) {
    return "";
  }
  try {
    return '<span class="' + (displayMode ? 'md-math md-math-display' : 'md-math md-math-inline') + '" data-tex="' + escapeHtml(clean) + '">' + parseMath(tokenizeMath(clean)) + "</span>";
  } catch (_error) {
    return '<code class="' + (displayMode ? 'md-math-fallback md-math-fallback-display' : 'md-math-fallback') + '">' + escapeHtml(clean) + "</code>";
  }
}

function mathBlockRule(state, startLine, endLine, silent) {
  var mathInfo = readMathBlock(state, startLine, endLine);
  if (!mathInfo) {
    return false;
  }
  if (silent) {
    return true;
  }
  var token = state.push("html_block", "", 0);
  token.content = renderMath(mathInfo.content, true) + "\n";
  token.map = [startLine, mathInfo.endLine + 1];
  state.line = mathInfo.endLine + 1;
  return true;
}

function mathInlineRule(state, silent) {
  var source = state.src;
  var start = state.pos;

  if (source.charAt(start) !== "$" || source.charAt(start + 1) === "$") {
    return false;
  }
  if (start > 0 && source.charAt(start - 1) === "\\") {
    return false;
  }
  if (/\s/.test(source.charAt(start + 1) || "")) {
    return false;
  }

  var end = start + 1;
  while ((end = source.indexOf("$", end)) !== -1) {
    if (source.charAt(end - 1) === "\\") {
      end += 1;
      continue;
    }
    if (/\s/.test(source.charAt(end - 1) || "")) {
      end += 1;
      continue;
    }
    break;
  }

  if (end === -1) {
    return false;
  }

  if (!silent) {
    var token = state.push("html_inline", "", 0);
    token.content = renderMath(source.slice(start + 1, end), false);
  }

  state.pos = end + 1;
  return true;
}

function addClassToToken(token, className) {
  if (!token || !className) {
    return;
  }
  var existing = token.attrGet("class");
  if (!existing) {
    token.attrSet("class", className);
    return;
  }
  var classes = existing.split(/\s+/);
  if (classes.indexOf(className) === -1) {
    classes.push(className);
    token.attrSet("class", classes.join(" "));
  }
}

function taskListCoreRule(state) {
  var tokens = state.tokens || [];
  var listStack = [];

  for (var i = 0; i < tokens.length; i += 1) {
    var token = tokens[i];

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      listStack.push(token);
      continue;
    }
    if (token.type === "bullet_list_close" || token.type === "ordered_list_close") {
      listStack.pop();
      continue;
    }

    if (
      token.type === "inline" &&
      i >= 2 &&
      tokens[i - 1].type === "paragraph_open" &&
      tokens[i - 2].type === "list_item_open" &&
      token.children &&
      token.children.length > 0 &&
      token.children[0].type === "text"
    ) {
      var firstText = token.children[0];
      var match = firstText.content.match(/^\[( |x|X)\]\s+/);
      if (!match) {
        continue;
      }

      firstText.content = firstText.content.slice(match[0].length);
      token.content = token.content.replace(/^\[( |x|X)\]\s+/, "");

      var TokenCtor = firstText.constructor;
      var checkboxToken = new TokenCtor("html_inline", "", 0);
      checkboxToken.content = '<span class="md-task-box" aria-hidden="true"><input class="md-task-checkbox" type="checkbox" disabled' + (match[1].toLowerCase() === "x" ? " checked" : "") + "></span>";
      token.children.unshift(checkboxToken);

      if (listStack.length > 0) {
        addClassToToken(listStack[listStack.length - 1], "md-task-list");
      }
      addClassToToken(tokens[i - 2], "md-task-item");
    }
  }
}

module.exports = function applyCustomMarkdown(mdLib) {
  mdLib.inline.ruler.before("link", "custom_inline_tags", customInlineTagRule);
  mdLib.inline.ruler.before("escape", "custom_math_inline", mathInlineRule);
  mdLib.block.ruler.before("fence", "custom_math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"]
  });
  mdLib.block.ruler.before("fence", "custom_directive_block", customDirectiveBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"]
  });
  mdLib.core.ruler.after("inline", "custom_task_lists", taskListCoreRule);
};
