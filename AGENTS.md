# AGENTS.md

这个仓库现在的真实项目是 `mogged`。仓库名还是 `mogged.games`，默认公开域名是 `mogged.games`。不要再把 repo 名、品牌名、公开域名混成一个概念。

## 先记住这几个硬事实

- 品牌：`mogged`
- 默认公开域名：`https://mogged.games`
- 仓库：`https://github.com/CharlieLZ/mogged.games`
- 公开站点语言：`en`、`zh`、`de`、`fr`、`es`、`ja`、`it`、`ko`、`ar`
- 历史公开内容链路已删除，不要再偷偷加回来
- 公开生成器现在分成两条干净入口：
  - `ai-video-generator`
  - `ai-image-generator`

## 当前目标

1. 维护一个干净的 mogged 公开站点
2. 维护一个只服务 Seedance 2.0 的托管视频工作台
3. 维护一个走 KIE 图片链路的公开图片工作台
4. 保持 5 个公开工作流入口清晰：
   - `text-to-video`
   - `image-to-video`
   - `reference-to-video`
   - `text-to-image`
   - `image-to-image`
5. 保持浏览器媒体工具、支付、用户、任务链路稳定
6. 保持代码能删、能测、能回滚

## 不要做的事

- 不要重建公开博客系统
- 不要恢复旧的图片优先公开链路
- 不要把旧站品牌名重新写回公开文案
- 不要写“万金油工具模块”

## 提交规则

- 不要提交任何 `env` 相关文件
- `git commit` / `git push` 范围里默认排除 `.env`、`.env-ref`、`.env.example`
- 如果改动里混入了 `env` 文件，先移出暂存区，再继续提交别的代码
- 需要环境变量说明时，优先写文档，不要改 `.env.example`

## Git 工作区规则

- 项目根目录默认固定在 `main`，只用于同步主线、查看当前基线、必要时启动 main 版本
- 开始任何新任务前，先在项目根目录执行：

```bash
git switch main
git pull --ff-only
git status --short --branch
```

- 新任务不要直接在项目根目录改代码，统一从 `main` 创建隔离 worktree：

```bash
git worktree add .worktrees/<task-name> -b <branch-name> main
cd .worktrees/<task-name>
```

- 在 worktree 里启动开发服务前，先确认当前位置和分支：

```bash
pwd
git branch --show-current
```

- 在 worktree 里完成开发、验证通过后，默认直接收尾，不要停下来等我补命令：

```bash
git status --short
git add <relevant-files>
git commit -m "<commit-message>"
cd <project-root>
git switch main
git pull --ff-only
git merge --ff-only <branch-name>
git push origin main
git worktree remove .worktrees/<task-name>
git branch -d <branch-name>
git fetch --prune
```

- 除非我明确说不要提交、不要合并或不要 push，否则任务完成后默认自动执行：提交当前分支、合并回本地 `main`、push 到 `origin/main`、清理 worktree 和本地分支
- 不要反复追问我要不要执行这些命令；只有在测试失败、合并冲突、push 失败或外部权限阻塞时才停下来说明原因
- 如果已经完成 merge / push，只剩清理步骤，则执行：

```bash
cd <project-root>
git worktree remove .worktrees/<task-name>
git branch -d <branch-name>
git fetch --prune
```

- 日常判断当前工作区归属时，优先查看：

```bash
git worktree list
git status --short --branch
git branch --show-current
```

- 核心原则：根目录永远代表 `main`，功能开发永远在 `.worktrees/<task-name>`，合并后立刻清理

## 代码职责分层

```text
src/app/                 路由边界、metadata、API handlers
src/shared/services/     业务编排
src/shared/models/       数据访问
src/extensions/          外部 provider 适配
src/shared/lib/          校验、SEO、安全、限流、幂等、通用工具
```

## 文档真相原则

- 文档必须跟代码一致
- README 只写当前系统，不写旧站历史幻觉
- AGENTS 只写当前边界，不写“曾经规划过但没落地”的东西
- 文档只保留当前还存在的系统和流程

## 部署真相原则

- 这个项目的生产默认发布链路是 **Cloudflare 侧绑定 GitHub 后自动发布**
- 不要把“仓库里没有 GitHub Actions workflow”误写成“没有自动发布”
- `pnpm cf:deploy` 是手动发布 / 兜底 / 排障入口，不是默认生产发布真相
- Cloudflare Worker 线上运行时以 Worker bindings、`wrangler.jsonc`、Cloudflare secrets、数据库 `config` 表为准；本地 `.env` 只能证明本地脚本有值
- `wrangler.jsonc` 里的 `keep_vars: true` 必须保留，稳定且非敏感的生产必需 plain-text vars 要直接写进 `wrangler.jsonc`
- `pnpm cf:vars:sync` 只能补齐缺失 plain-text vars，不能替代 `wrangler.jsonc`；`pnpm cf:secrets:sync` 会把本地 `.env` 中的非占位 key 上传为 secrets，执行前必须确认不会把 plain-text binding 撞成 secret 冲突
- 如果 `pnpm cf:deploy` 在 route 阶段因为 token 缺少 zone route 权限失败，只有在确认现有 custom domain route 已经正确指向该 Worker 时，才允许用 no-routes 临时配置只更新 Worker script/config

## 线上排障和 env 清单规则

- 遇到 Cloudflare、支付、webhook、auth、AI provider、storage、通知、analytics、SEO 或 env 问题，先看 [read-checking-list.md](./read-checking-list.md)
- 排查 env 时必须同时对照：
  - 本地 `.env` / `.env-ref`
  - `wrangler.jsonc`
  - Cloudflare Worker bindings
  - 数据库 `config` 表中的小写 runtime config override
- 排查时只输出 key 名、binding type、是否存在、长度、来源，不输出真实 value
- 新增或改名任何 env/config key 时，必须同步更新：
  - `src/config/index.ts`
  - `scripts/verify-env.ts`
  - `src/shared/services/settings.ts`（如果需要后台覆盖）
  - `scripts/setup-cf-vars.mjs`（如果是 plain-text runtime var）
  - `wrangler.jsonc`（如果是稳定生产 plain-text var）
  - [read-checking-list.md](./read-checking-list.md) 的 env/key 总盘点
- 支付 provider 相关问题不要只看 Stripe key；先确认 `DEFAULT_PAYMENT_PROVIDER`、`STRIPE_ENABLED`、三项 Stripe secret、DB config override、`src/shared/services/payment.ts` 的 provider 注册条件
- Stripe 签名错误和 `payment provider not found` 是两类问题：前者查 raw body / endpoint `whsec`，后者查 provider 注册和 Worker runtime vars
- Cloudflare / OpenNext 问题要同时检查 `wrangler.jsonc`、`src/middleware.ts`、Hyperdrive、`.open-next/cloudflare/next-env.mjs`、secret artifact guard
- AI 生成问题按“入口 -> 扣费 -> provider task -> callback/query/fallback -> storage URL -> credits ledger”拆开查，避免只补一个 provider key 就结束

## 低耦合、高内聚怎么落地

- `src/shared/lib/brand.ts`
  只管品牌 token、公开域名和默认 SEO 图
- `src/shared/lib/home-gallery.ts`
  只管首页画廊和远程素材映射
- `src/shared/blocks/generator/sample-media.ts`
  只管公开示例视频和封面

## 输入校验底线

- 空值兜底，但关键 key 要直接 fail fast
- 网络重试有边界，不能死循环
- 不吞异常，日志里至少要有 keyword / videoId / step

## 改代码时优先顺序

1. 先删旧逻辑和旧文档
2. 再补最小可运行链路
3. 最后才考虑抽象

## 开发前先看

- [README.md](./README.md)
