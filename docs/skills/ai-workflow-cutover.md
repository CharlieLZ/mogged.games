---
name: ai-workflow-cutover
description: Use when reusing this repository for a new AI product and the public image or video workflows, provider adapters, task polling, or sample media need to be kept, removed, or retargeted.
---

# AI Workflow Cutover

参考文档：[AI工作流与Provider迁移](../矩阵/06-AI工作流与Provider迁移.md)

## 输入

- 是否保留图片工作台
- 是否保留视频工作台
- 新 provider 对应关系
- 新 sample media
- 新 pricing / credits 假设

## 必看文件

- `src/app/[locale]/(landing)/(ai)/*`
- `src/shared/services/seedance.ts`
- `src/shared/services/kie-image.ts`
- `src/extensions/ai/*`
- `src/shared/blocks/generator/*`

## 执行步骤

1. 先锁定要保留的公开工作流入口。
2. 再决定 provider adapter 和 service 层怎么切换。
3. 更新样例媒体、默认文案、SEO copy、价格说明。
4. 校验 `generate`、`query`、guest create/query、recent tasks、delete 等全链路。

## 验证

- 所有保留的 workflow 页面都能进入
- 生成任务可创建、可轮询、可回放
- 价格和 credits 不会与新 provider 成本脱节

## 停止条件

- 还没决定保留哪些 workflow，就开始大规模删路由
- 只换 provider key，没核对任务链路和示例内容
