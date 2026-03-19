# cf-coach 复习系统

在现有 Dashboard 基础上增加间隔复习功能。

## 核心概念

用户做完题后手动添加复习条目，系统按间隔提醒复习。每条复习内容有生命周期，按 1→3→7→21 天间隔推进。

## 复习条目类型

四种类型，各有固定格式：

### A: 语法类型
- 格式：`语法名称 + 用法说明`
- 例：`lower_bound` / `重载运算符写法`

### B: 解题思路
- 格式：`题目描述 + 解题策略`
- 例：CF 1735C — 看到 LCM+分组 → 想并查集，按字典序贪心合并

### C: 踩坑记录
- 格式：`踩坑原因 + 下次如何避免`
- 例：数组越界 — 并查集 find 里忘记判 size，下次先写 assert

### D: 新知识点
- 格式：`解决哪种问题 + 简易写法`
- 例：区间合并 — sort by left, merge overlapping
- **特殊规则**：D 类型在第 14 天额外显示一次（即间隔为 1→3→7→14→21）

## 复习间隔与状态机

每条复习条目有以下状态：

```
stage: 0 | 1 | 2 | 3 | 4 (对应 D 类型: 0 | 1 | 2 | 3 | 4 | 5)
nextReviewDate: ISO date string
```

间隔规则：
- 通用类型 (A/B/C): 第1天 → +3天 → +7天 → +21天 → 完成
- D 类型: 第1天 → +3天 → +7天 → +14天 → +21天 → 完成

用户操作：
- **"过"按钮**：标记本次复习成功，推进到下一个 stage，计算下次复习日期
- **"重置"按钮**：将 stage 重置为 0，nextReviewDate 设为明天（从头来过）
- **不操作**：该条目第二天继续出现，整个周期不推进（stage 不变，nextReviewDate 设为明天）

完成所有 stage 后，条目标记为 `completed: true`，不再出现在复习面板中。

## 积压上限

如果当天待复习条目超过 10 条，只显示最旧的 10 条（按 nextReviewDate 升序），剩余自动顺延到后续日期。避免积压导致用户放弃。

## 数据存储

### `~/.cf-coach/review.json`

```json
[
  {
    "id": "r_1710000000000",
    "type": "A",
    "content": "lower_bound — 返回第一个 >= val 的迭代器，用 *it 取值",
    "stage": 1,
    "nextReviewDate": "2026-03-22",
    "createdAt": "2026-03-19T15:00:00Z",
    "completedAt": null
  },
  {
    "id": "r_1710000000001",
    "type": "B",
    "content": "CF 1735C — 看到 LCM+分组想并查集，按字典序贪心合并",
    "stage": 3,
    "nextReviewDate": "2026-04-01",
    "createdAt": "2026-03-15T10:00:00Z",
    "completedAt": null
  }
]
```

## 后端 API

### `GET /api/review`
返回当天待复习的条目（nextReviewDate <= 今天 且 completed != true），按 nextReviewDate 升序，上限 10 条。

响应：
```json
{
  "items": [...],
  "todayCount": 12,
  "totalActive": 35,
  "totalCompleted": 8
}
```
`todayCount` 是实际到期数（可能 > 10），让用户知道还有积压。

### `POST /api/review`
添加新条目。

请求体：
```json
{
  "type": "A",
  "content": "lower_bound — 返回第一个 >= val 的迭代器"
}
```

`id` 和 `createdAt` 自动生成。`stage` 初始为 0，`nextReviewDate` 设为明天。

### `POST /api/review/:id/pass`
标记该条目"过"。推进 stage + 计算下次日期。如果已是最后一个 stage，设 `completedAt`。

### `POST /api/review/:id/reset`
重置该条目。stage = 0，nextReviewDate = 明天。

## 前端 Dashboard 集成

### Profile 区域
在 Accepted / Submissions / Attempted 旁边新增第 4 个 metric 框：
- 标签：`Review`
- 数值：今日待复习数量
- 点击后滚动到复习面板（或展开复习面板）

### 复习面板
位置：右栏（训练侧），Roadmap 上方。

面板结构：
1. **面板标题**：`Today's Review`，副标题显示 `X / Y due`（X = 显示数，Y = 实际到期数）
2. **条目列表**：每条显示：
   - 类型徽章（A/B/C/D，不同颜色）
   - 内容文本
   - 当前 stage 进度指示（如 ●●○○ 表示 4 阶段中完成了 2 个）
   - "过" 按钮 + "重置" 按钮
3. **添加区域**（面板底部）：
   - 类型选择（A/B/C/D 四个按钮，点击选中）
   - 输入框（单行，placeholder 按类型变化）
   - 回车或点击添加按钮提交
   - 提交后输入框清空，新条目出现在列表中（明天开始复习）

### 类型徽章颜色
- A (语法): `#56d364` (绿)
- B (思路): `#8a7db3` (紫/accent)
- C (踩坑): `#ff7b72` (红)
- D (知识点): `#f4c95d` (黄)

### 交互
- "过"和"重置"操作后，该条目在列表中即时更新（过 → 移除/显示下次日期，重置 → 显示进度重置动画）
- 面板支持折叠/展开（与其他面板一致）
- 空状态显示："No reviews due today ✨"

## 技术约束

- 与现有代码风格一致：零外部 npm 依赖，vanilla JS，server-side JSON 文件读写
- review.json 读写需要文件锁或原子写入（先写临时文件再 rename），防止并发损坏
- 复习面板的 CSS 沿用现有 dashboard.css 的设计语言（panel、card 样式）
- 新增的 API 路由加到现有 dashboard-server.js 中
- 新增的渲染逻辑加到现有 dashboard.js 中

## 不需要做的

- 不需要 CLI 命令（纯 Dashboard 功能）
- 不需要导入/导出
- 不需要统计复习历史/正确率
- 不需要修改现有面板的功能
