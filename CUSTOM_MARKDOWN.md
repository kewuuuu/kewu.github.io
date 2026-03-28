# 自定义 Markdown 语法

优先使用标准 Markdown。只有当标准语法不足以表达排版或交互时，再使用这里的扩展。

## 标准 Markdown 仍然可用

- `**加粗**`
- `~~删除线~~`
- `[链接文本](https://example.com)`
- 有序/无序列表
- `---` 分割线
- 表格
- 任务列表：`- [x] 已完成` / `- [ ] 待办`

## 行内标签

### 通用写法

```md
[tag key=value key=value]内容[/tag]
```

### 可用标签

| 标签 | 用途 | 常用参数 |
| --- | --- | --- |
| `span` | 通用行内样式 | `color` `bg` `highlight` `size` `font` `weight` `bold` `underline` `strike` |
| `mark` | 荧光笔高亮 | `highlight` `color` |
| `u` | 下划线 | `color` `bg` |
| `sup` | 上标 | `color` `size` |
| `sub` | 下标 | `color` `size` |
| `anchor` | 定义文内跳转锚点 | `id` |
| `xref` | 跳转到文内锚点 | `to` |
| `cell` | 给表格单元格内容加整格背景 | `bg` `color` |
| `math` | 行内公式（也推荐直接用 `$...$`） | 无 |

### 示例

```md
[span color=#be123c size=1.15em]彩色放大文字[/span]
[mark highlight=#fde68a]高亮文字[/mark]
[u]下划线[/u]
H[sub]2[/sub]O
m[sup]2[/sup]
[anchor id=part-a]被引用的位置[/anchor]
[xref to=part-a]跳到引用位置[/xref]
```

## 块级标签

### 1. 样式块

```md
::: block align=center color=#1f2937 bg=#f8fafc size=18px line=1.9 indent=2em border=#d0d7de radius=16px id=intro
这里是一整块内容。
::: endblock
```

常用参数：

- `id`：块级锚点，可配合 `xref` 使用
- `class`：额外类名
- `align`：`left` `center` `right` `justify`
- `color`：文字颜色
- `bg`：背景色
- `size`：字号，例如 `18px`
- `line`：行高，例如 `1.8`
- `indent`：首行缩进，例如 `2em`
- `border`：边框颜色
- `radius`：圆角，例如 `16px`
- `marker`：列表标记方式，支持 `disc` `circle` `square` `decimal` `lower-alpha` `upper-alpha` `lower-roman` `upper-roman`

### 2. 折叠块

```md
::: details title="折叠标题" open
折叠内容可以是任意 Markdown。
::: enddetails
```

参数：

- `title`：折叠标题
- `open`：默认展开
- 其余样式参数与 `block` 一致

### 3. 分栏

```md
::: columns id=demo-columns ratios=1,1,2 gap=20px
第一栏内容
::: column
第二栏内容
::: column
第三栏内容
::: endcolumns
```

参数：

- `id`：分栏实例唯一标识，用于浏览器记住拖拽后的栏宽
- `ratios`：默认宽度权重，例如 `1,1,2`
- `gap`：分栏间距变量（当前主要影响视觉和拖拽布局）

说明：

- 每一栏里都可以继续写任意 Markdown、折叠块、样式块、列表、公式等
- 前端会优先读取浏览器里记住的拖拽结果；如果没有，就使用文章里声明的 `ratios`
- 移动端会自动改为纵向堆叠显示

## 公式

### 推荐写法

行内公式：

```md
$E = mc^2$
```

块级公式：

```md
$$
\frac{1}{n} \sum_{i=1}^{n} x_i^2 \approx \alpha + \sqrt{\beta_i}
$$
```

### 当前支持的常见内容

- 上下标：`x^2` `a_i`
- 分式：`\frac{a}{b}`
- 根号：`\sqrt{x}`
- 常见希腊字母：`\alpha` `\beta` `\lambda` 等
- 常见运算符：`\sum` `\int` `\approx` `\leq` `\geq` `\cdot` `\times` 等

说明：当前是站内轻量公式渲染，不等同于完整 LaTeX 引擎。复杂宏和高级排版建议控制在常见数学表达式范围内。

## 图片

```md
![alt](路径 "img:key=value;key=value")
```

| 参数 | 别名 | 值 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `align` | - | `left` `center` `right` | `center` | 图片对齐方式 |
| `mode` | `size` `image-size-mode` | `responsive` `fixed` `scale` `responsive-scale` | `responsive-scale` | 尺寸计算模式 |
| `width` | `w` | 数字或尺寸值 | 空 | 图片宽度 |
| `height` | `h` | 数字或尺寸值 | 空 | 图片高度 |
| `scale` | - | 正数 | 空 | 按原图倍率缩放 |
| `ratio` | `responsive-scale` `responsiveScale` | 百分比或比例值 | `50%` | 按正文宽度比例缩放 |

示例：

```md
![图](./assets/a.png "img:align=right;mode=fixed;width=320;height=240")
```
