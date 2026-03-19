---
title: Nunjucks 模板语法与 Eleventy(11ty) 使用笔记
description: 结合当前项目结构，梳理 11ty 与 Nunjucks 的关系、集合机制和模板写法。
date: 2026-03-16
templateEngineOverride: md
---

# Nunjucks 模板语法与 Eleventy(11ty) 使用笔记

## 1. 概念关系

- **11ty (Eleventy)**：静态站点生成器（SSG），负责读取源码、组织数据、生成 HTML。
- **Nunjucks**：模板引擎，负责模板语法（变量、循环、过滤器、判断等）。

一句话：**11ty 是构建系统，Nunjucks 是模板语言**。

## 2. 官方文档

- Nunjucks: <https://mozilla.github.io/nunjucks/cn/getting-started.html>
- 11ty: <https://www.11ty.dev/>

## 3. 当前项目目录（已更新）

```text
src/
├─ _includes/
│  └─ layout.njk
├─ assets/
│  └─ style.css
├─ posts/
│  ├─ posts.11tydata.js
│  └─ hello-11ty/
│     ├─ hello-11ty.md
│     └─ assets/
│        └─ 小鹤双拼-键位图.png
└─ index.njk
```

说明：

- 每篇文章放在自己的子目录中（例如 `posts/hello-11ty/`）。
- 文章资源放在该文章子目录下的 `assets/`。
- 没有资源的文章不需要创建 `assets/`。

## 4. package.json 配置

文件：`package.json`

```json
{
  "name": "kewu-blog-11ty",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "prebuild": "node -e \"require('fs').rmSync('docs',{ recursive: true, force: true })\"",
    "dev": "npx @11ty/eleventy --serve",
    "build": "npx @11ty/eleventy"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.1.2"
  }
}
```

字段说明：

1. `scripts.dev`
   启动本地开发服务器，用于实时预览。
2. `scripts.build`
   执行正式构建，把 `src/` 编译到 `docs/`。
3. `scripts.prebuild`
   在构建前先清理 `docs/`，避免旧文件残留导致路径混乱。
4. `devDependencies`
   声明 11ty 版本，团队和 CI 能用一致依赖构建。

## 5. 11ty 构建配置（.eleventy.js）

文件：`.eleventy.js`

```js
module.exports = function (eleventyConfig) {
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
```

这段配置的作用：

1. 把全站静态资源 `src/assets` 拷贝到 `docs/assets`。
2. 把每篇文章下的 `assets` 目录原样拷贝到输出目录对应位置。
3. 指定输入目录是 `src`，输出目录是 `docs`。

## 6. posts.11tydata.js 与 collections.posts 的关系

文件：`src/posts/posts.11tydata.js`

```js
module.exports = {
  layout: "layout.njk",
  tags: ["posts"],
  permalink: "/posts/{{ page.fileSlug }}/index.html"
};
```

字段说明：

- `layout: "layout.njk"`  
  `src/posts` 下文章默认使用 `layout.njk` 渲染。

- `tags: ["posts"]`  
  给这些文章统一打上 `posts` 标签。  
  11ty 会把同标签内容自动聚合成 `collections.posts`。

- `permalink`  
  指定文章输出地址规则。  
  例如：`hello-11ty.md -> /posts/hello-11ty/`（实际文件为 `index.html`）。

## 7. Front Matter（前置元数据）

在页面或文章顶部使用 `---` 包裹配置：

```yaml
---
layout: layout.njk
title: 首页
permalink: /index.html
---
```

含义：

- `layout`：套用哪个模板。
- `title`：页面变量，可在模板中通过 `{{ title }}` 使用。
- `permalink`：构建后的输出路径。

## 8. 首页模板循环写法

文件：`src/index.njk`

```njk
{% for post in collections.posts | reverse %}
  <article class="card">
    <h2><a href="{{ post.url | replace('/', '', 1) }}">{{ post.data.title }}</a></h2>
    <p class="meta">{{ post.date.toISOString().slice(0, 10) }}</p>
    <p>{{ post.data.description }}</p>
  </article>
{% endfor %}
```

说明：

- `collections.posts`：由 `tags: ["posts"]` 自动生成的文章集合。
- `| reverse`：过滤器写法，倒序显示（最新在前）。
- `post.data.*`：读取文章 Front Matter 中的字段。
- `replace('/', '', 1)`：将链接开头的 `/` 去掉，适配当前本地预览路径。

## 9. 文章内引用图片

在 `hello-11ty.md` 中可这样写：

```md
![小鹤双拼键位图](./assets/小鹤双拼-键位图.png)
```

构建后会输出为对应的静态资源路径：

- 页面：`docs/posts/hello-11ty/index.html`
- 图片：`docs/posts/hello-11ty/assets/小鹤双拼-键位图.png`

## 10. 本地构建命令

```bash
npm run build
```

执行后，11ty 会把 `src/` 内容编译到 `docs/`。
