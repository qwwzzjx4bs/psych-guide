let usedEmbedFallback = false;

export function didUseEmbedFallback() {
  return usedEmbedFallback;
}

export async function loadJsonWithFallback(url, embedId) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (_) { /* file:// ・オフライン等 */ }

  const el = document.getElementById(embedId);
  const text = el?.textContent?.trim();
  if (!text) {
    throw new Error(`データを読み込めません: ${url}`);
  }

  usedEmbedFallback = true;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`データの解析に失敗: ${url}`);
  }
}
