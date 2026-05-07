# SEO、路由、内容与多语言迁移

## 这块负责什么

迁移时最容易破坏的，是公开可发现页面和真实 canonical 规则。

这层要同时管：

- 可索引页与 noindex 页
- sitemap / robots / llms 路由
- locale 路由
- 页面 copy 与 metadata
- 法律页、mission、free tools 等公开内容

## 真相源

- `readurl.md`
- `src/middleware.ts`
- `src/config/website/public-page-metadata.ts`
- `src/shared/lib/site-discovery.ts`
- `src/config/locale/index.ts`
- `src/config/locale/messages/*`
- `content/pages/*.mdx`

## 路由迁移原则

### 1. 不要随便改 canonical 页面结构

当前 canonical 公开页主干是：

- `/`
- `/pricing`
- `/ai-video-generator`
- `/ai-video-generator/text-to-video`
- `/ai-video-generator/image-to-video`
- `/ai-video-generator/reference-to-video`
- `/ai-image-generator`

如果新项目要删路径，先同步改：

- `readurl.md`
- `public-page-metadata`
- sitemap
- `middleware.ts`
- 页面文案与导航

### 2. noindex 规则要跟业务边界一致

当前默认 noindex 的典型路径：

- `free-tools/*`
- 法律页
- 认证页
- 用户工作台
- 后台

如果新项目希望把某类页面转成 indexable，必须同时改 metadata 和 `middleware.ts`。

## 多语言迁移原则

当前 live public locales：

- `en`
- `zh`
- `de`
- `fr`
- `es`
- `ja`
- `it`
- `ko`
- `ar`

迁移时先决定：

- 全保留
- 只保留 `en` + 少数高优先语言
- 先保留 `en`，其他语言后续补齐

不要出现这种状态：

- 路由开着
- 页面链接存在
- 文案却还是旧品牌或未翻译占位值

## 内容迁移标准步骤

### 1. 先定哪些页面继续公开存在

把这些页分三类：

- 继续保留
- 暂时 noindex 保留
- 直接删除

### 2. 改 metadata 与 discoverability

必查：

- 页面 title / description / alternates
- sitemap
- robots
- llm.txt / llms.txt / llms-full.txt

### 3. 改 locale copy

至少要过：

- landing
- pricing
- ai image
- ai video
- certificate
- common
- settings / activity / admin（若保留）

### 4. 复查公开内容页

包括：

- `mission`
- 法律页
- free tools 索引与工具页

这些页面虽然不一定全索引，但都属于公开品牌暴露面。

## 验收

- `sitemap.xml` 只列出你想公开索引的页面
- `robots.txt` 与 `middleware.ts` 的 noindex 规则一致
- locale alternates 正确
- 不存在旧品牌和旧域名的 metadata 残留

## 常见坑

- 图片两个 mode 被误改成独立 canonical 页面
- sitemap 里还残留已删除路径
- 只改了英文文案，其他 locale 还是旧品牌
- `readurl.md` 没更新，导致文档真相和代码分裂
