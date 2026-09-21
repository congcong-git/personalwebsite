// 管理端 CRUD（admin 页的服务端 Route Handler 调用）
// 复用 cloudbase.ts 的 getCloudbaseDb()（统一的环境变量校验 + SDK 动态加载）
import { getCloudbaseDb } from "./cloudbase";

export async function listDocs(collection: string): Promise<Record<string, unknown>[]> {
  const db = await getCloudbaseDb();
  const res = await db.collection(collection).limit(100).get();
  return res.data ?? [];
}

export async function upsertDoc(
  collection: string,
  doc: Record<string, unknown>
): Promise<string> {
  const db = await getCloudbaseDb();
  const id = doc._id;
  if (typeof id === "string" && id) {
    const rest = Object.fromEntries(
      Object.entries(doc).filter(([k]) => k !== "_id")
    );
    // 用 set 整文档替换，避免 update 的点号深合并与库里旧字符串字段（如 wechat.desc）
    // 冲突（"Cannot create field 'en' in element {desc: ...}"）。rest 已含完整文档（去 _id）。
    await db.collection(collection).doc(id).set(rest);
    return id;
  }
  const res = await db.collection(collection).add(doc);
  return res.id;
}

export async function removeDoc(collection: string, id: string): Promise<void> {
  const db = await getCloudbaseDb();
  await db.collection(collection).doc(id).remove();
}
