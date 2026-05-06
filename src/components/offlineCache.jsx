const CACHE_KEY = 'traductor_offline_translations';

export function saveToOfflineCache(translation) {
  try {
    const existing = getOfflineCache();
    const key = `${translation.original_word}__${translation.source_language}__${translation.target_language}`;
    existing[key] = { ...translation, cached_at: Date.now() };
    const entries = Object.entries(existing);
    if (entries.length > 200) {
      const trimmed = entries.sort((a, b) => b[1].cached_at - a[1].cached_at).slice(0, 200);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
    }
  } catch (e) {}
}

export function getOfflineCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function searchOfflineCache(word, sourceLang, targetLang) {
  const cache = getOfflineCache();
  const wordLower = word.trim().toLowerCase();
  const exactKey = `${word.trim()}__${sourceLang}__${targetLang}`;
  if (cache[exactKey]) return cache[exactKey];
  return Object.values(cache).find(
    t =>
      t.original_word?.toLowerCase() === wordLower &&
      t.source_language === sourceLang &&
      t.target_language === targetLang
  ) || null;
}

export function getAllOfflineCacheList() {
  const cache = getOfflineCache();
  return Object.values(cache).sort((a, b) => (b.cached_at || 0) - (a.cached_at || 0));
}