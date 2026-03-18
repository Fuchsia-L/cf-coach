# cf-coach

一个零依赖的 Node.js Codeforces 训练 CLI。它负责拉取本地缓存、离线统计训练数据、识别薄弱点，并按 roadmap + anchor/prerequisite/review 流程推荐下一题。

## 环境要求

- Node.js 18+
- 无额外 npm 依赖

## 安装与运行

```bash
node cf.js --help
node cf.js fetch --handle tourist
```

默认数据目录位于 `~/.cf-coach`。测试或多环境隔离时，可通过 `CF_COACH_HOME` 指定自定义目录。

## 常用命令

- `node cf.js fetch --handle <handle>`：从 Codeforces API 拉取用户、提交、rating、题库缓存
- `node cf.js stats --handle <handle>`：从本地缓存生成统计快照
- `node cf.js weak --handle <handle>`：结合 roadmap 输出薄弱项与优先训练建议
- `node cf.js next --handle <handle>`：推荐下一组 anchor + prerequisites
- `node cf.js next --handle <handle> --review`：输出需要回打的旧锚点
- `node cf.js next --handle <handle> --topic greedy`：手动指定推荐 topic
- `node cf.js serve --port 3000`：启动本地 Dashboard HTTP 服务

完成一次 `fetch` 后，`stats`、`weak`、`next` 均可在离线环境下直接读取本地缓存运行。

## 配置

配置文件路径：`~/.cf-coach/config.json`

示例：

```json
{
  "handle": "Fuchsia_L",
  "currentTopic": null,
  "topicOverrides": {
    "two pointers": "双指针"
  }
}
```

支持的环境变量：

- `CF_COACH_HOME`：覆盖应用根目录
- `CF_COACH_MAP_PATH`：覆盖默认 `map.md`
- `CF_COACH_GUIDE_PATH`：覆盖默认 `guide.md`
- `CF_COACH_API_FIXTURE_DIR`：测试时使用本地 API fixture 代替线上请求

## 缓存布局

`~/.cf-coach/cache` 下默认包含：

- `user.json`
- `submissions.json`
- `rating.json`
- `problems.json`

CLI 会在缓存缺失、损坏、快照不一致或请求了其他 handle 时给出可执行的修复提示，通常只需要重新运行 `fetch`。

## 训练资源

- `map.md`：阶段路线图、tag、rating 区间、每阶段完成阈值
- `guide.md`：anchor 难度、prerequisite 偏移、review 规则

如果你要验证自定义训练方案，可以临时设置：

```bash
CF_COACH_MAP_PATH=./map.md
CF_COACH_GUIDE_PATH=./guide.md
node cf.js weak --handle tourist
```

## 典型工作流

1. `node cf.js fetch --handle tourist`
2. `node cf.js stats --handle tourist`
3. `node cf.js weak --handle tourist`
4. `node cf.js next --handle tourist`
5. 完成 prerequisites 后，使用 `node cf.js next --handle tourist --review` 检查是否需要回打 anchor

## 测试

```bash
npm test
```

测试覆盖 fixture 驱动的 `fetch` / `stats` / `weak` / `next` 流程、Dashboard JSON API、前端渲染逻辑、以及本地 Dashboard smoke 流程。

## Dashboard 视觉检查

```bash
node cf.js fetch --handle tourist
node cf.js serve --port 3000
```

- 在桌面宽度（推荐 `1440px` 左右）打开 `http://localhost:3000`
- 再将浏览器宽度调整到 `1024px`，确认 profile、rating trend、roadmap、tag ability、rating buckets 仍可阅读和滚动
- 检查 rating trend 悬停 tooltip 是否显示 contest 名称和 rating delta
- 检查 roadmap 当前阶段高亮、完成阶段绿色态、未开始阶段弱化态是否正确
- 如需留档，可分别截取一张桌面宽度和一张 `1024px` 宽度截图
