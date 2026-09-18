---
slug: three-gripper-greedy
title: 三抓手码垛的贪心算法实践
date: 2026-08-12
tags: [算法, 码垛, 机器人]
excerpt: 如何用贪心策略解决五花垛的分层放置问题，以及抓手约束的处理。
lang: zh
---

## 背景

三抓手码垛需要在有限空间内稳定堆叠「五花垛」。核心难点在于：**横包可合并放置，竖包需旋转 90° 单独放置**，且每层 5 包（2 横 + 3 竖）的约束导致放包次序必须精确规划。

## 贪心策略

采用逐层求解的贪心算法：

1. 每次抓取 3 个横包，按层级从低到高放置；
2. 放满当前层后 Z 轴升高，进入下一层；
3. 放包次序：层级 1 先放 `bh1 + bh2` 合并，再逐个放 `av1 / av2 / av3`；
4. 跨层竖包（如 `bv1`）补至下一层级。

## 抓手约束

| 抓手 | 约束 |
|---|---|
| 1 号 | 禁放 b 区竖包 |
| 2 号 | 无限制 |
| 3 号 | 禁放 a 区竖包 |

## 核心放置逻辑（伪代码）

```ts
function placeLayer(layer: Layer, grippers: Gripper[]): Plan {
  const plan: Step[] = [];
  // 先合并横包
  plan.push(...placeHorizontal(layer.bh1, layer.bh2, grippers));
  // 再逐个处理竖包
  for (const v of [layer.av1, layer.av2, layer.av3]) {
    const g = pickGripper(v, grippers); // 遵守 a/b 区约束
    if (g) plan.push(placeVertical(v, g));
    else plan.push(deferToNextLayer(v)); // 跨层补充
  }
  return plan;
}
```

当前正在调试跨层补充逻辑，确保 `av2 / av3` 不被错误拆组——这是贪心优先级（先合并横包，再逐个竖包，跨层竖包补至下一层）没被正确执行导致的。
