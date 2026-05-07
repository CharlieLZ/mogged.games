# AI工作流与 Provider 迁移

## 当前工作流真相

公开入口当前固定为五个：

- `text-to-video`
- `image-to-video`
- `reference-to-video`
- `text-to-image`
- `image-to-image`

当前产品实现上：

- 视频工作台走 Seedance 2.0 链路
- 图片工作台走 KIE 图片链路

## 真相源

- `src/app/[locale]/(landing)/(ai)/ai-video-generator/*`
- `src/app/[locale]/(landing)/(ai)/ai-image-generator/*`
- `src/shared/services/seedance.ts`
- `src/shared/services/kie-image.ts`
- `src/extensions/ai/*`
- `src/shared/services/ai-task-refresh.ts`
- `src/shared/services/prompt-translation.ts`
- `src/shared/services/prompt-rewrite.ts`
- `src/shared/blocks/generator/sample-media.ts`

## 迁移时先做的决定

1. 新项目是否继续保留图片和视频双工作台？
2. 是否继续沿用 Seedance + KIE，还是只换 provider 不换工作流？
3. 五个公开入口是否原样保留，还是只保留其中一部分？

推荐做法：

- **先保留工作流结构，再换 provider**

这样能保证 SEO、路由、支付、任务历史、样例媒体这几层不用同时改。

## 标准迁移步骤

### 1. 保持路由结构稳定

除非你非常确定不需要，否则先保留：

- `/ai-video-generator`
- `/ai-video-generator/text-to-video`
- `/ai-video-generator/image-to-video`
- `/ai-video-generator/reference-to-video`
- `/ai-image-generator`

图片的 `text-to-image` / `image-to-image` 当前是 query mode，不是独立 canonical 页。

### 2. 决定 provider 替换范围

分成三层看：

- provider adapter：`src/extensions/ai/*`
- service facade：`src/shared/services/seedance.ts` `src/shared/services/kie-image.ts`
- workspace / form / sample media / pricing：`src/shared/blocks/generator/*`

优先在 adapter 与 service 层换，不要先改页面层。

### 3. 校验 env 与开关

重点检查：

- `SEEDANCE_KIE_ENABLED`
- `KIE_API_KEY_*`
- `VOLCENGINE_API_KEY`
- `OPENROUTER_API_KEY`
- 其他实际使用中的 AI provider key

### 4. 复查任务创建、查询、回调链路

至少验证：

- `POST /api/ai/generate`
- `POST /api/ai/query`
- guest 图片 create/query
- prompt translate / rewrite
- recent tasks / batch refresh

### 5. 替换样例媒体与公开描述

如果新项目面向不同场景，不要忘记改：

- 工作流文案
- SEO copy
- sample media
- 默认 prompt / rewrite 逻辑

## 验收

- 五个公开工作流入口的路由、文案、canonical 规则都正确
- 登录用户与 guest 用户的可用链路符合预期
- 任务能创建、轮询、展示结果、回放媒体
- 定价和 credits 与实际生成成本一致

## 常见坑

- 只改 provider key，没改样例媒体和公开文案
- 改了图片工作流路径，忘了 `middleware.ts` 里的历史跳转规则
- 只验证 create，没有验证 query / recent / refresh / delete
