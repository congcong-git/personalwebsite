---
slug: vue-loading-animation
title: Vue 装车动画的装载统计与货架层数逻辑
date: 2026-07-20
tags: [Vue, Canvas, 动画]
excerpt: 在 shuangjitou 分支里，装车动画如何计算货架最大层数与装载率。
lang: zh
source: xuniw 的技术笔记
---

## 概述

装车动画（`carAnimation/animation3.0.vue`）在 `shuangjitou` 分支与团队协作开发，目标是把「货车装载」过程以 Canvas 动画呈现，并实时展示**装载统计**与**货架最大层数**。

## 货架最大层数计算

货架最大层数取决于单包高度与车厢限高：

```ts
const maxLayers = Math.floor(
  (truckHeight - floorClearance) / unitHeight
);
```

装载率则按已用体积 / 可用体积估算：

```ts
const loadRate = usedVolume / availableVolume;
```

## 动画状态机

动画采用「层 → 排 → 列」的三级递增渲染，每层渲染完成后触发 `onLayerDone` 回调更新统计面板。当前正在排查**提交记录未显示**的问题（疑似分支同步与 `.git` 引用异常）。
