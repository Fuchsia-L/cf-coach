# cf-coach Dashboard 美化优化

在现有 Dashboard 基础上进行视觉与布局优化。**不改动后端 API**，只修改前端文件（`dashboard.css` + `dashboard.js`）。

## 核心问题

当前 dashboard 使用 12 列 grid，左右面板严格对齐——左侧面板内容长（如 Tag Ability 30+ 行）时，右侧面板对齐后留下大段空白，页面整体过长。

## 修改范围

只改这两个文件：
- `src/dashboard/dashboard.css`
- `src/dashboard/dashboard.js`

不改后端（`dashboard-server.js`、`dashboard-data.js`）、不改 API 接口、不增加 npm 依赖、不改现有测试的 API 数据格式。

## 布局优化

### 1. 取消左右严格对齐，改用 CSS Masonry 风格布局
- 使用 CSS `columns` 或 `masonry`（如果浏览器支持不够就用 columns fallback）让面板自然瀑布流排列
- 或者使用独立的 grid row 让每个面板独立占据所需高度，不强制和旁边的面板等高
- 目标：消除右侧面板因对齐产生的大段空白

### 2. Tag Ability 面板
- 默认只显示 Top 10 的 tag
- 添加 "Show All" / "收起" 按钮切换完整列表
- 按钮样式和现有深色主题一致

### 3. Roadmap 面板
- 20 个 stage 太多，默认折叠只显示当前阶段和前后各 2 个（共 5 个）
- 添加 "Show All Stages" / "收起" 按钮
- 当前阶段始终可见

## 视觉优化

### 4. 字体大小
- 基础字体从当前尺寸增大 ~15%（body 级别）
- Panel 标题（h2）至少 20px，section kicker 至少 13px
- 图表轴标签至少 13px

### 5. 间距
- 面板之间 gap 从 24px 增到 28-32px
- 面板内部 padding 从 20-24px 增到 24-28px
- 各区域有明确的视觉呼吸感

### 6. 面板圆角和阴影
- 保持现有深色主题风格
- 可以微调阴影让面板层次更分明

### 7. 图表优化
- Rating Trend 折线：增加渐变填充区域（线下方半透明填充），让图表更有质感
- Submission Timeline 散点：点稍微大一点（r=5 → r=6），hover 时放大到 r=9
- 所有图表 tooltip 改用自定义 div tooltip（替换 SVG `<title>`），样式和面板主题一致

### 8. 交互细节
- 面板 hover 时 border 微亮（opacity 变化）
- Problem card hover 动画更柔和（加 transition）
- 滚动时顶部 Profile Bar 可选 sticky（`position: sticky`）

## 约束

- 零外部 npm 依赖（纯 CSS + vanilla JS）
- 保持现有深色主题配色（可以微调色值但不换配色方案）
- 桌面优先，最小宽度 1024px 可用
- 现有测试如果只测 API 和数据逻辑，不应该被破坏
- 如果测试涉及前端 DOM 结构（class 名、data 属性），允许适度调整测试以匹配新结构

## 验收标准

- [ ] 页面整体长度明显缩短（消除空白对齐问题）
- [ ] Tag Ability 默认只显示 10 个，可展开
- [ ] Roadmap 默认只显示 5 个 stage，可展开
- [ ] 字体整体偏大更易读
- [ ] 图表 tooltip 是自定义 styled div，不是浏览器默认 title
- [ ] Rating Trend 有渐变填充
- [ ] Profile Bar sticky
- [ ] 面板和卡片有流畅的 hover transition
- [ ] 所有现有 API 测试通过
