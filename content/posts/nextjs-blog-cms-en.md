---
slug: nextjs-blog-cms-en
title: Building a Personal Site with Next.js + CloudBase CMS
date: 2026-09-16
tags: [Next.js, CloudBase, CMS]
excerpt: Frontend and backend deployed to EdgeOne Makers; content managed by CloudBase CMS as a real admin.
lang: en
---

## Why this stack

A personal site needs to be: **fast in China, zero-ops, free, and with a real admin backend**. After comparing options, the hybrid architecture is:

- Frontend: Next.js (App Router) with `output: export` for pure static output
- Admin: **Tencent CloudBase CMS** (standalone account + role permissions + cloud storage media)
- Deploy: **EdgeOne Makers** (free, fast Asian edge)

## Data pulled at build time

Content is not stored in local MDX. Instead, it is fetched from the CMS collection at build time via `@cloudbase/node-sdk`:

```ts
const app = init({
  env: process.env.CLOUDBASE_ENV_ID!,
  secretId: process.env.CLOUDBASE_SECRET_ID!,
  secretKey: process.env.CLOUDBASE_SECRET_KEY!,
});
const { data } = await app.database().collection("posts").get();
```

> Edit in CMS → Webhook triggers GitHub Actions rebuild → EdgeOne redeploys, live in seconds to minutes.

## i18n and theming

- i18n via `next-intl` `[locale]` route segment (zh / en)
- Dark mode via `next-themes`, `attribute="class"`

This splits "writing content" from "changing code" — blog, projects, about, and links are all managed in the CMS backend.
