// 部署构建：以静态导出模式产出 out/（EdgeOne Pages 对 Next.js 的要求）
//
// 为什么要临时挪走 src/app/api/admin：
//   管理端 API 是动态路由（要读 Cookie 做会话鉴权），静态导出无法产出；
//   而 Next 在 output:export 下会要求所有 route handler 可静态化，
//   若强行标 force-static，又会导致开发态 GET 被预渲染缓存、鉴权失效。
//   因此这里只在「导出构建期间」把该目录挪到点开头的目录（Next 不扫描），构建结束必定还原。
//
// 用法：node scripts/build-export.mjs   （package.json 里已接成 npm run build:export）
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const API_DIR = path.join(process.cwd(), "src", "app", "api");
const SRC = path.join(API_DIR, "admin");
// 必须挪到 src/app 之外：App Router 会把 app/ 下的（含点开头的）目录都当路由段扫描
const HIDDEN = path.join(process.cwd(), "src", ".admin-hidden");

function restore() {
  if (fs.existsSync(HIDDEN) && !fs.existsSync(SRC)) {
    fs.renameSync(HIDDEN, SRC);
    console.log("[build-export] 已还原 src/app/api/admin");
  }
}

// 先清理上一次异常中断留下的隐藏目录，避免目录丢失
restore();

if (!fs.existsSync(SRC)) {
  console.error("[build-export] 找不到 src/app/api/admin，跳过隐藏步骤");
}

// 清掉 .next 缓存：dev server 会在 .next/dev/types 下生成引用 admin 路由的类型文件，
// 目录隐藏后这些引用会变成 TS 报错（属于构建缓存，删除安全）。
fs.rmSync(path.join(process.cwd(), ".next"), { recursive: true, force: true });

fs.renameSync(SRC, HIDDEN);
console.log("[build-export] 已临时隐藏 src/app/api/admin，开始构建…");

let code = 1;
try {
  const r = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    stdio: "inherit",
    env: { ...process.env, BUILD_STATIC_EXPORT: "true" },
  });
  code = typeof r.status === "number" ? r.status : 1;
} catch (e) {
  console.error("[build-export] 构建异常：", e);
} finally {
  restore();
}

if (code !== 0) console.error("[build-export] 构建失败（exit " + code + "）");
process.exit(code);
