---
name: business-integrations-cutover
description: Use when storage, payments, email, analytics, customer support, notifications, or affiliate integrations must be enabled, disabled, or reconfigured for a cloned project.
---

# Business Integrations Cutover

参考文档：[存储、支付与业务集成迁移](../矩阵/07-存储、支付与业务集成迁移.md)

## 输入

- 要保留的支付商
- 要保留的存储方案
- 要保留的邮件 / 分析 / 客服 / 联盟模块

## 必看文件

- `src/shared/services/storage.ts`
- `src/extensions/storage/*`
- `src/extensions/payment/*`
- `src/shared/services/payment.ts`
- `src/extensions/email/*`
- `src/shared/services/support-contact.ts`
- `src/shared/lib/admin-notification.ts`
- `src/extensions/analytics/*`
- `src/extensions/customer-service/*`
- `src/extensions/affiliate/*`

## 执行步骤

1. 按模块列出“启用 / 禁用 / 待定”状态。
2. 先确认存储和支付，因为它们最影响真实业务可用性。
3. 支付要同时确认 provider 开关、默认 provider、secret、Webhook endpoint、商品映射。
4. 邮件 / support 要同时确认发件 provider、`ADMIN_NOTIFICATION_EMAIL`、`CONTACT_NOTIFICATION_EMAIL`、public support fallback。
5. 对不需要的分析、客服、联盟、广告脚本，直接关闭，不带占位值上线。
6. 逐个验证上传、checkout、Webhook、邮件发送、support/contact modal、脚本注入。

## 验证

- 上传与回放正常
- 结账与支付状态查询正常
- 邮件和通知来自新品牌
- contact/support 表单能发送，缺 CONTACT 时 fallback 行为明确
- 分析 / 客服脚本只在需要时加载

## 停止条件

- 支付商品映射还没确定
- 存储域名和公开回放 URL 还指向旧环境
- support/contact 收件人职责没确定
- 只能确认本地 `.env`，不能确认 Worker runtime 的 provider key
