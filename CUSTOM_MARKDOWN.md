# 自定义 Markdown 记录

## 1. 图片

### 1.1 语法

```md
![alt](路径 "img:key=value;key=value")
```

### 1.2 说明

- `alt`：替代文本
- `路径`：图片路径
- `img:`：图片模块参数前缀

### 1.3 参数

| 参数 | 别名 | 值 | 默认 | 备注 |
| --- | --- | --- | --- | --- |
| `align` | - | `left` `center` `right` | `center` | 控制图片在正文中的左右位置 |
| `mode` | `size` `image-size-mode` | `responsive` `fixed` `scale` `responsive-scale` | `responsive-scale` | 控制图片尺寸计算方式 |
| `width` | `w` | 数字或尺寸值 | 空 | 设置图片宽度 |
| `height` | `h` | 数字或尺寸值 | 空 | 设置图片高度 |
| `scale` | - | 正数 | 空 | 按原图尺寸倍率缩放 |
| `ratio` | `responsive-scale` `responsiveScale` | 百分比或比例值 | `50%` | 按正文宽度比例自适应缩放 |

### 1.4 模式

| `mode` | 生效参数 | 备注 |
| --- | --- | --- |
| `responsive` | `width` | 按给定宽度自适应，高度保持比例 |
| `fixed` | `width` `height` | 固定宽高显示 |
| `scale` | `scale` | 按原图尺寸倍率缩放 |
| `responsive-scale` | `ratio` | 按正文宽度比例自适应缩放 |

### 1.5 示例

默认：

```md
![图](./assets/a.png)
```

左对齐：

```md
![图](./assets/a.png "img:align=left")
```

右对齐 + 固定大小：

```md
![图](./assets/a.png "img:align=right;mode=fixed;width=320;height=240")
```
