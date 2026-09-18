---
slug: nextjs-blog-cms
title: 用 Next.js + 云开发 CMS 搭个人站
date: 2026-09-16
tags: [Next.js, CloudBase, CMS]
excerpt: 前后端一体化部署到 EdgeOne Makers，内容交给云开发 CMS 真后台。
lang: zh
---

## 为什么选这套组合

个人站要的是：**国内快、零运维、¥0、还得有真后台**。对比一圈后定下混合架构：

- 前端：Next.js（App Router）+ `output: export` 纯静态
- 后台：**腾讯云云开发 CMS**（独立账号 + 角色权限 + 云存储富媒体）
- 部署：**EdgeOne Makers**（免费、亚洲节点快）

## 数据在构建时拉取

内容不落本地 MDX，而是构建时通过 `@cloudbase/node-sdk` 读 CMS 集合：

```ts
const app = init({
  env: process.env.CLOUDBASE_ENV_ID!,
  secretId: process.env.CLOUDBASE_SECRET_ID!,
  secretKey: process.env.CLOUDBASE_SECRET_KEY!,
});
const { data } = await app.database().collection("posts").get();
```

> CMS 改内容 → Webhook 触发 GitHub Actions 重建 → EdgeOne 重新部署，几十秒~几分钟上线。

## 双语与主题

- 国际化走 `next-intl` 的 `[locale]` 路由段（zh / en）
- 明暗主题用 `next-themes`，`attribute="class"` 策略

这一套把「写内容」和「改代码」彻底分开——博客/项目/关于/友链全在 CMS 后台维护。
