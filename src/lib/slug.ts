// slug 归一化：把所有 slug 规整为 URL 安全的 ASCII（中文转拼音），
// 避免中文 slug 在静态导出 / 路由匹配时出现 404。
import { pinyin } from "pinyin-pro";

// 将任意字符串转成 ASCII slug：中文 -> 无声调拼音，其余非字母数字统一替换为连字符。
export function toAsciiSlug(input: string): string {
  const s = (input || "").toString().trim();
  if (!s) return "";
  let pinyinized: string;
  try {
    pinyinized = pinyin(s, { toneType: "none", type: "string", nonZh: "consecutive" });
  } catch {
    // 拼音转换异常时退化为直接剔除非 ASCII 字符
    pinyinized = s;
  }
  return pinyinized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 规整文档 slug：优先用填写值，否则回退到标题；最终必须是 ASCII。
// 若仍为空（极端情况），回退到 post-<日期>-<随机>，保证非空。
export function normalizeSlug(rawSlug: unknown, fallbackSource: string): string {
  const desired = typeof rawSlug === "string" ? rawSlug.trim() : "";
  const source = typeof fallbackSource === "string" ? fallbackSource.trim() : "";
  const slug = toAsciiSlug(desired || source);
  if (slug) return slug;
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `post-${ymd}-${Math.random().toString(36).slice(2, 8)}`;
}
