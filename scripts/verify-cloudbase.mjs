// 云开发（免费体验版 / 个人版通用）node-sdk 连通性验证
// 用法：node --env-file=.env.local scripts/verify-cloudbase.mjs
// 前置：已安装 @cloudbase/node-sdk，且已在 CloudBase 控制台
//      1) 创建环境  2) 建好 posts 集合（并填 1 条数据）  3) 配置 API 密钥
import pkg from "@cloudbase/node-sdk";
const { init } = pkg;

const env = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;

if (!env || !secretId || !secretKey) {
  console.error(
    "❌ 缺少环境变量，请先 `cp .env.example .env.local` 并填入 CLOUDBASE_ENV_ID / SECRET_ID / SECRET_KEY"
  );
  process.exit(1);
}

try {
  const app = init({ env, secretId, secretKey });
  const db = app.database();
  const res = await db.collection("posts").limit(3).get();
  console.log("✅ node-sdk 连通成功（免费版文档库可用）");
  console.log("posts 集合命中条数:", res.data.length);
  console.log(JSON.stringify(res.data.slice(0, 2), null, 2));
  console.log("\n下一步：把 .env.local 接入构建（pnpm build 会自动从文档库拉取内容）。");
} catch (e) {
  console.error("❌ 连通失败：", e?.message || e);
  console.error(
    "排查：免费体验版需先在控制台创建环境并建集合；密钥用腾讯云主账号 API 密钥（访问管理→API密钥管理）或环境密钥（环境→环境配置→环境密钥）。"
  );
  process.exit(1);
}
