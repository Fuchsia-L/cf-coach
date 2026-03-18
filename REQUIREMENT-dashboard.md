# cf-coach Web Dashboard

在现有 CLI 基础上增加 `node cf.js serve` 命令，启动本地 Web Dashboard，可视化训练数据。

## 技术约束

- 零外部 npm 依赖（Node.js 内置 `http`/`fs`/`path` 模块）
- 前端纯 HTML + CSS + vanilla JS（Canvas/SVG 画图表），内嵌在 JS 字符串或 `src/web/` 目录下
- 后端提供 JSON API，前端 fetch 数据后渲染
- **重构前置**：开始 dashboard 功能之前，先把现有代码中重复的工具函数抽取到 `src/utils.js`，包括但不限于：`isFiniteNumber`、`normalizeString`、`normalizeTag`、`normalizeTags`、`hasAnyCache`、`getCacheHandle`、`formatRating`。清理 `stats.js`、`weak.js`、`next.js`、`training.js` 中的重复定义，改为从 `utils.js` 导入。已有测试必须继续通过。
- 架构要方便后续扩展（新面板、新 API 端点、新图表类型），前端组件化（每个面板一个渲染函数）

## 命令

### `cf serve [--port <number>]`

- 默认端口 3000，`--port` 可覆盖
- 启动后打印 `Dashboard: http://localhost:<port>`
- Ctrl+C 优雅退出

## 后端 API

所有接口返回 JSON，读取本地缓存（`~/.cf-coach/cache/`），不调用 CF API。

- `GET /api/profile` — 用户基本信息（handle、rating、maxRating、rank、总 AC、总提交、总尝试题数）
- `GET /api/rating-history` — rating 变化历史（每场比赛一个点：比赛名、时间戳、newRating）
- `GET /api/tag-stats` — 各 tag 的 AC 数、尝试数、通过率
- `GET /api/rating-buckets` — 按题目 rating 分档的 AC 分布
- `GET /api/roadmap` — 20 阶段训练路线图 + 每阶段当前进度（AC 数/目标数）+ 当前阶段标记
- `GET /api/weak` — 弱项分析结果（tag 缺口 + rating 薄弱区 + 路线图缺口）
- `GET /api/next` — 推题结果（当前主题、锚点题、前置题，含 CF 链接）
- `GET /api/submissions` — 全量提交记录（时间戳、题目 rating、verdict、题目 ID、题名、tags）用于时间线散点图

## 前端 Dashboard 布局

深色主题，响应式（桌面优先，最小宽度 1024px 可用）。

### 1. Profile Bar（顶部通栏）
- 左：handle 名 + 当前 rating（带颜色，按 CF 标准着色）+ rank
- 右：总 AC / 总提交 / 尝试题数

### 2. Rating 趋势（左上）
- 折线图，每场比赛一个数据点
- 横轴：比赛时间（按实际时间戳，不等距）
- 纵轴：rating
- 鼠标悬停显示：比赛名、rating 变化（+/-）
- 折线颜色按 CF rating 颜色分段

### 3. 训练路线图（右上）
- 20 个阶段，水平或垂直进度条
- 每个阶段显示：阶段名、tag、AC 数/目标数
- 当前阶段高亮
- 已完成阶段标绿，未开始灰色

### 4. Tag 能力图（左中）
- 水平柱状图
- 按 AC 数降序排列
- 每个 tag 两条柱：AC 数（实色）+ 尝试数（半透明）
- 右侧标注通过率百分比

### 5. Rating 分档分布（右中）
- 柱状图，800/900/1000/.../1600+
- 柱高 = AC 数
- 颜色按 CF rating 着色（灰/绿/青/蓝/紫/黄）

### 6. 训练面板（底部通栏，左右分栏）
- **左：弱项分析**
  - tag 薄弱项列表（AC 率 < 50% 且尝试 ≥ 3）
  - rating 薄弱区
  - 当前阶段缺口（差几题、哪些 tag）
- **右：推题卡片**
  - 当前主题 + 阶段进度
  - 锚点题卡片（题名、rating、tags、CF 链接）
  - 3 张前置题卡片（同上）
  - 点击卡片在新标签页打开 CF 题目页

### 7. 提交时间线（最底部通栏）
- 散点图
- 横轴：提交时间戳（实际时间，不按天聚合）
- 纵轴：题目 rating
- 点颜色按 verdict：AC 绿色、WA 红色、TLE 橙色、其他灰色
- 鼠标悬停显示：题名、verdict、提交时间

## CF Rating 配色标准

- < 1200: 灰色 #808080
- 1200-1399: 绿色 #008000
- 1400-1599: 青色 #03A89E
- 1600-1899: 蓝色 #0000FF
- 1900-2099: 紫色 #AA00AA
- 2100-2299: 橙色 #FF8C00
- 2300+: 红色 #FF0000

## 不需要做的

- 不需要登录/认证
- 不需要实时刷新（用户手动刷新页面即可）
- 不需要移动端适配（桌面可用就行）
- 不需要修改现有 CLI 命令的输出格式
