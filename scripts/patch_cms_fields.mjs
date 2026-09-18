// 补丁式写入（只增不改）：给线上 CMS 补 T17 新字段。
//   - profile 单条：补 wechat 对象
//   - vue-loading-animation：补 source（与本地 content/posts 保持一致）
// CloudBase 的 update 是局部更新，只写这里列出的字段，不动其它已有字段。
// 用法：node --env-file=.env.local scripts/patch_cms_fields.mjs
import pkg from "@cloudbase/node-sdk";
const { init } = pkg;

const env = process.env.CLOUDBASE_ENV_ID;
const secretId = process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.CLOUDBASE_SECRET_KEY;
if (!env || !secretId || !secretKey) {
  console.error("❌ 请先填 .env.local 的 CLOUDBASE_ENV_ID / SECRET_ID / SECRET_KEY");
  process.exit(1);
}

const app = init({ env, secretId, secretKey });
const db = app.database();

const WECHAT = {
  name: "xuniw 的技术笔记",
  qr: "/wechat-official-qr.svg",
  desc: "",
};
const SOURCE_PATCH = { "vue-loading-animation": "xuniw 的技术笔记" };

// 1) profile：补 wechat
const profileRes = await db.collection("profile").limit(1).get();
const profile = profileRes.data[0];
if (!profile) {
  console.log("⚠️ profile 集合为空，跳过（请先建 profile 记录）");
} else {
  await db.collection("profile").doc(profile._id).update({ wechat: WECHAT });
  console.log(`✅ profile/name=${profile.name} 已补 wechat：${JSON.stringify(WECHAT)}`);
}

// 2) posts：按 slug 补 source
for (const [slug, source] of Object.entries(SOURCE_PATCH)) {
  const q = await db.collection("posts").where({ slug }).limit(1).get();
  const row = q.data[0];
  if (!row) {
    console.log(`⚠️ 未找到 posts/${slug}，跳过`);
    continue;
  }
  await db.collection("posts").doc(row._id).update({ source });
  console.log(`✅ posts/${slug} 已补 source：${source}`);
}

console.log("\n🎉 补丁完成。重启/重建站点后即可在 CMS 模式下看到公众号板块与来源徽章。");
