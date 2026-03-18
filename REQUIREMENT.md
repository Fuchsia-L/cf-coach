# cf-coach

Codeforces 训练助手 CLI。基于个人训练体系（锚点题→前置题→回打→四句总结），提供 rating 统计、弱项分析、智能推题、训练日志。

## 技术栈

- Node.js（纯 JS，不用 TS）
- 命令行工具，`node cf.js <command>` 运行
- Codeforces API（公开接口，无需 API key）
- 本地 JSON 文件存储（`~/.cf-coach/`）
- 零外部 npm 依赖

## CF 账户

- Handle: `Fuchsia_L`
- 默认 handle 存在配置文件里，命令可用 `--handle` 覆盖

## Codeforces API 端点

- `user.info?handles=X` — 用户基本信息 + rating
- `user.status?handle=X` — 所有提交记录
- `user.rating?handle=X` — rating 变化历史
- `problemset.problems` — 全量题库（题目 + 标签 + rating）

API 无需认证，有频率限制（~1 req/2s），需要做请求间隔控制。

## 命令

### `cf fetch`

拉取并缓存 CF 数据。

- 调用 `user.status` 拉全量提交记录
- 调用 `user.rating` 拉 rating 历史
- 调用 `problemset.problems` 拉题库
- 增量更新：对比本地缓存，只处理新数据
- 缓存到 `~/.cf-coach/cache/` 下的 JSON 文件
- 显示简要更新摘要（新增 X 条提交，Y 道新 AC）

### `cf stats`

统计面板。

- 当前 rating + 最高 rating + rank
- rating 变化趋势（近 N 场比赛，用 ASCII 简表）
- 各 tag 的 AC 数 / 尝试数 / 通过率
- 按题目 rating 分档（800/900/1000/.../1600+）的 AC 分布
- 总 AC 数、总提交数、总尝试题数

### `cf weak`

弱项分析。

- 找出：tag 尝试 ≥3 但 AC 率 < 50% 的
- 找出：某 rating 区间尝试多次但 AC 率低的
- 找出：在 map.md 训练路线图中，当前阶段应掌握但 AC 数不足的 tag
- 输出优先建议训练的 tag + rating 区间

### `cf next [--topic <tag>] [--review]`

推题引擎。

训练体系（来自 guide.md）：
1. 选一个**锚点题**：当前专题，rating 1500-1600（如果用户当前水平较低，整体下调：锚点 = 用户 rating + 400~500）
2. 选三道**前置题**：同专题，rating 分别为 锚点-300 / 锚点-200 / 锚点-100
3. 前置题优先选"结构类似"的（同 tag 组合），而非只看单个 tag
4. 过滤掉已 AC 的题目

当前专题判断逻辑：
- 读取 map.md 的 20 个专题阶段
- 根据用户已 AC 题目的 tag 分布 + rating 分布，判断当前应该在哪个阶段
- 每个专题需要 8-10 题 AC（≥6 题独立 AC）才算完成

`--topic <tag>`：手动指定专题，跳过自动判断
`--review`：推荐需要回打的旧锚点题（之前做过前置题但没回打的）

输出格式：
```
当前专题：并查集（第 7 / 20 阶段）
进度：5/8 题 AC

推荐锚点题：
  CF 1735C "Nikita and LCM" (1400, dsu+greedy)

推荐前置题：
  1. CF 1592B "Hemose in MHYSA" (1200, dsu)
  2. CF 1638C "..." (1300, dsu)
  3. CF ... (1400, dsu+greedy)
```

### `cf log <problem_id> [options]`

记录做题结果。

- `--verdict ac|wa|tle|skip` — 结果（默认从 CF 提交记录自动判断）
- `--solo` — 标记为独立 AC（非看题解）
- `--summary "四句总结"` — 四句总结（模型/没想到原因/补了什么/信号）
- `--note "备注"` — 自由备注
- 存储到 `~/.cf-coach/log.json`
- 一道题可以多次记录（追加不覆盖）

### `cf progress`

当前专题进度。

- 当前专题名称 + 在 map.md 中的位置
- 该专题已做题数 / 目标题数
- 独立 AC 数 / 需要数
- 是否达到进入下一专题的条件
- 下一专题预览

### `cf edit <problem_id> [field] [value]`

手动修改题目记录。

- 可修改字段：verdict、solo、summary、note、topic
- 可以手动添加非 CF 平台的题目记录（洛谷、AtCoder 等），用自定义 ID
- 可以手动调整专题归属（覆盖自动 tag 判断）
- `cf edit <id> --delete` 删除记录

## 数据结构

### `~/.cf-coach/config.json`
```json
{
  "handle": "Fuchsia_L",
  "currentTopic": null,
  "topicOverrides": {}
}
```

### `~/.cf-coach/cache/submissions.json`
CF API 返回的提交记录缓存。

### `~/.cf-coach/cache/problems.json`
CF API 返回的题库缓存。

### `~/.cf-coach/cache/rating.json`
CF API 返回的 rating 历史缓存。

### `~/.cf-coach/log.json`
训练日志，用户手动记录的做题信息。
```json
[
  {
    "id": "CF-1735C",
    "name": "Nikita and LCM",
    "rating": 1400,
    "tags": ["dsu", "greedy"],
    "topic": "并查集",
    "verdict": "ac",
    "solo": true,
    "summary": "1.并查集+贪心 2.没看出分组结构 3.前置题练了连通块思维 4.看到LCM+分组想并查集",
    "note": "",
    "timestamp": "2026-03-15T10:00:00Z",
    "role": "anchor"
  }
]
```

### `~/.cf-coach/topics.json`
专题进度追踪。从 map.md 编码而来。
```json
{
  "stages": [
    {
      "id": 1,
      "name": "排序 + 贪心",
      "phase": "基础识别 (1200-1400)",
      "tags": ["greedy", "sortings"],
      "targetCount": 8,
      "targetSoloAc": 6
    }
  ],
  "currentStage": 7
}
```

## AI 接口设计

所有数据用 JSON 文件存储在 `~/.cf-coach/`，结构清晰可读写。外部 AI（如 Lux）可以：

1. **读取**：直接读 JSON 文件了解训练状态、弱项、进度
2. **写入**：修改 `config.json` 调整当前专题、写入 `log.json` 添加建议
3. **推荐**：读取 cache + log 数据后，写入 `~/.cf-coach/ai-suggestions.json` 提供个性化建议

`ai-suggestions.json` 结构：
```json
{
  "updatedAt": "2026-03-18T10:00:00Z",
  "dailyAdvice": "并查集专题快收尾了，独立 AC 还差 1 题。今天建议做 CF 1559D。",
  "suggestedProblems": [
    { "id": "CF-1559D", "reason": "并查集+图论结合，你图论 AC 率高可以借力" }
  ],
  "weeklyReview": "本周 AC 12 题，rating 区间集中在 1200-1400，可以开始碰 1500 了。"
}
```

`cf advice` 命令读取并显示 AI 建议文件内容。

## 训练路线图数据

将 map.md 的 20 个专题硬编码进 `topics.json`，包含：
- 专题名称、阶段、对应 CF tags
- 按 map.md 的顺序排列
- 用户可通过 `cf edit` 或直接改 JSON 调整

## 约束

- API 请求间隔 ≥ 2 秒，避免被限流
- 所有输出用中文
- 不做 Web UI（以后加，目前 CLI only）
- 不做自动提交代码
- 不接入 AtCoder / 洛谷 API（但 log 支持手动记录非 CF 题目）
