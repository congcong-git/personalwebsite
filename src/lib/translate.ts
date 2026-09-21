// 腾讯云机器翻译（TMT）封装。仅服务端 admin 保存时调用；
// 无密钥或调用失败时回退原文（中文），渲染层再按 locale 回退，零破坏。
// SDK 自带类型声明，通过通用 request() 调用 TextTranslate / TextTranslateBatch；
// 凭证复用 CloudBase 同账号 SecretId/SecretKey。

const REGION = process.env.TMT_REGION || "ap-guangzhou";

// 仅用到的 request 子集（SDK 的 Client 继承 AbstractClient.request）
type TmtClient = {
  request(
    action: string,
    req: Record<string, unknown>
  ): Promise<{ TargetText?: string; TargetTextList?: string[] }>;
};

function getCreds(): { secretId: string; secretKey: string } | null {
  const secretId = process.env.TMT_SECRET_ID || process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.TMT_SECRET_KEY || process.env.CLOUDBASE_SECRET_KEY;
  return secretId && secretKey ? { secretId, secretKey } : null;
}

async function getClient(): Promise<TmtClient | null> {
  const creds = getCreds();
  if (!creds) return null;
  try {
    const mod = await import("tencentcloud-sdk-nodejs-tmt");
    const Client = mod.tmt.v20180321.Client;
    if (typeof Client !== "function") return null;
    return new Client({
      credential: { secretId: creds.secretId, secretKey: creds.secretKey },
      region: REGION,
      profile: { httpProfile: { endpoint: "tmt.tencentcloudapi.com" } },
    }) as unknown as TmtClient;
  } catch {
    return null;
  }
}

export async function translateText(
  text: string,
  target = "en",
  source = "zh"
): Promise<string> {
  if (!text.trim()) return text;
  const client = await getClient();
  if (!client) return text;
  try {
    const res = await client.request("TextTranslate", {
      SourceText: text,
      Source: source,
      Target: target,
      ProjectId: 0,
    });
    return res.TargetText || text;
  } catch (e) {
    console.warn("[translate] TMT 调用失败，回退原文：", e);
    return text;
  }
}

// 批量翻译：跳过空串，结果按原顺序回填（空串保持空）
export async function translateBatch(
  texts: string[],
  target = "en",
  source = "zh"
): Promise<string[]> {
  const result = texts.slice();
  const idx = texts
    .map((t, i) => (t && t.trim() ? i : -1))
    .filter((i) => i >= 0);
  if (idx.length === 0) return result;
  const client = await getClient();
  if (!client) return result;
  try {
    const batch = idx.map((i) => texts[i]);
    const res = await client.request("TextTranslateBatch", {
      Source: source,
      Target: target,
      ProjectId: 0,
      SourceTextList: batch,
    });
    const translated = res.TargetTextList ?? [];
    idx.forEach((orig, k) => {
      if (translated[k]) result[orig] = translated[k];
    });
  } catch (e) {
    console.warn("[translate] TMT 批量翻译失败，回退原文：", e);
  }
  return result;
}
