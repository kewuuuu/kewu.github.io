# 自定义 Markdown 语法

优先使用标准 Markdown。只有在标准语法无法满足排版或交互需求时，再使用这里的扩展。

## 标准 Markdown 仍可用

- `**加粗**`
- `~~删除线~~`
- `[链接文本](https://example.com)`
- 有序/无序列表
- `---` 分割线
- 表格
- 任务列表：`- [x] 已完成` / `- [ ] 待办`
- 代码块与行内代码

## 行内标签

通用格式：

```md
[tag key=value key=value]内容[/tag]
```

### 可用标签

| 标签 | 用途 | 常用参数 |
| --- | --- | --- |
| `span` | 通用行内样式 | `color` `bg` `highlight` `size` `font` `weight` `bold` `underline` `strike` `class` |
| `mark` | 荧光笔高亮 | `highlight` `color` `class` |
| `u` | 下划线 | `color` `bg` `class` |
| `sup` | 上标 | `color` `size` `class` |
| `sub` | 下标 | `color` `size` `class` |
| `anchor` | 文内锚点 | `id` `class` |
| `xref` | 文内跳转引用 | `to` `target` |
| `cell` | 表格单元格整格填充色 | `bg` `color` `class` |
| `math` | 行内公式（也推荐直接用 `$...$`） | 无 |
| `hover` | 被解释字（悬浮解释触发词） | `ref`/`id`/`to`/`target`，以及 `span` 同款样式参数 |

### 行内示例

```md
[span color=#be123c size=1.1em]彩色文字[/span]
[mark highlight=#fde68a]荧光笔[/mark]
H[sub]2[/sub]O，m[sup]2[/sup]
[anchor id=part-a]锚点文本[/anchor]
[xref to=part-a]跳转到锚点[/xref]
[hover ref=term-index]索引[/hover]
```

## 块级指令

### 1. 样式块

```md
::: block align=center color=#1f2937 bg=#f8fafc size=18px line=1.9 indent=2em border=#d0d7de radius=16px id=intro
这里是一整块内容。
::: endblock
```

参数：

- `id`：块级锚点（可配合 `xref`）
- `class`：额外类名
- `align`：`left` `center` `right` `justify`
- `color`：文字颜色
- `bg`：背景色
- `size`：字号（如 `18px`）
- `line`：行高（如 `1.8`）
- `indent`：首行缩进（如 `2em`）
- `border`：边框颜色
- `radius`：圆角（如 `16px`）
- `padding`：内边距
- `shadow`：布尔开关，开启阴影
- `marker`：列表标记方式：`disc` `circle` `square` `decimal` `lower-alpha` `upper-alpha` `lower-roman` `upper-roman`

### 2. 折叠块

```md
::: details title="折叠标题" open
折叠内容可写任意 Markdown。
::: enddetails
```

参数：

- `title`：标题
- `open`：默认展开
- 其他样式参数与 `block` 一致

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

- `id`：分栏实例唯一标识（用于记忆拖拽后的宽度）
- `ratios`：默认宽度权重（如 `1,1,2`）
- `gap`：分栏间距
- `class`：额外类名

说明：

- 每栏内可继续写任意 Markdown、自定义块、折叠、公式等
- 前端优先读取浏览器里保存的拖拽结果；没有时使用文内 `ratios`
- 小屏下自动变成纵向堆叠

### 4. 悬浮解释块（Hover Card 定义）

```md
::: hovercard id=term-index title="索引说明" width=420px max=560px
这里可以写任意 Markdown 和自定义模块。

::: block bg=#f8fafc border=#d0d7de
可以嵌套样式块、折叠块、分栏、表格、公式等。
::: endblock
::: endhovercard
```

参数：

- `id` / `ref` / `to` / `target`：对应 `[hover ...]` 的目标 id
- `title`：解释框标题（可选）
- `width`：解释框宽度（可选）
- `max` / `maxwidth` / `max-width`：解释框最大宽度（可选）
- `class`：额外类名（可选）

行为：

- 悬浮或聚焦在 `[hover ...]` 文本时显示解释框
- 自动判断上方/下方可用空间，优先显示在更空的一侧
- 鼠标移入解释框仍保持显示
- 鼠标移出触发词和解释框后延迟隐藏，减少抖动

## 公式

推荐写法：

```md
$E = mc^2$
```

```md
$$
\frac{1}{n} \sum_{i=1}^{n} x_i^2 \approx \alpha + \sqrt{\beta_i}
$$
```

当前支持常见数学表达：

- 上下标：`x^2` `a_i`
- 分式：`\frac{a}{b}`
- 根号：`\sqrt{x}`
- 常见希腊字母：`\alpha` `\beta` `\lambda`
- 常见符号：`\sum` `\int` `\approx` `\leq` `\geq` `\cdot` `\times`

说明：当前为站内轻量公式渲染，不等同完整 LaTeX 引擎。

## 图片增强参数

语法：

```md
![alt](路径 "img:key=value;key=value")
```

| 参数 | 别名 | 值 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `align` | - | `left` `center` `right` | `center` | 对齐方式 |
| `mode` | `size` `image-size-mode` | `responsive` `fixed` `scale` `responsive-scale` | `responsive-scale` | 尺寸模式 |
| `width` | `w` | 数字或长度 | 空 | 图片宽度 |
| `height` | `h` | 数字或长度 | 空 | 图片高度 |
| `scale` | - | 正数 | 空 | 按原图倍率缩放 |
| `ratio` | `responsive-scale` `responsiveScale` | 百分比或比例值 | `50%` | 按正文宽度比例缩放 |

示例：

```md
![示例图](./assets/a.png "img:align=right;mode=fixed;width=320;height=240")
```
