/**
 * AI Content Cache Utility
 * Caches AI-generated content by level/theme to reduce latency and API costs
 */

const CACHE_PREFIX = 'ai_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cache key from parameters
 * @param {string} type - Content type (vocab, grammar, quiz, exercise)
 * @param {string} level - CEFR level (A1-C1 or 'all')
 * @param {string} theme - Optional theme/topic
 * @returns {string} Cache key
 */
export function getCacheKey(type, level, theme = '') {
    const normalizedLevel = level?.toLowerCase() || 'all';
    const normalizedTheme = theme?.toLowerCase().replace(/\s+/g, '_') || 'default';
    return `${CACHE_PREFIX}${type}_${normalizedLevel}_${normalizedTheme}`;
}

/**
 * Get cached content
 * @param {string} type - Content type
 * @param {string} level - CEFR level
 * @param {string} theme - Optional theme
 * @returns {Object|null} Cached content or null
 */
export function getCachedContent(type, level, theme = '') {
    const key = getCacheKey(type, level, theme);
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);

        // Check if cache is expired
        if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch (err) {
        console.warn('Error reading AI cache:', err);
        return null;
    }
}

/**
 * Store content in cache
 * @param {string} type - Content type
 * @param {string} level - CEFR level
 * @param {string} theme - Optional theme
 * @param {Object} data - Content to cache
 */
export function setCachedContent(type, level, theme = '', data) {
    const key = getCacheKey(type, level, theme);
    try {
        const cacheEntry = {
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (err) {
        console.warn('Error writing AI cache:', err);
    }
}

/**
 * Clear all AI content cache
 */
export function clearAICache() {
    try {
        const keys = Object.keys(localStorage);
        keys.filter(k => k.startsWith(CACHE_PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch (err) {
        console.warn('Error clearing AI cache:', err);
    }
}

/**
 * Clear cache for a specific type/level
 * @param {string} type - Content type
 * @param {string} level - CEFR level (optional)
 */
export function clearCacheForType(type, level = null) {
    try {
        const keys = Object.keys(localStorage);
        const prefix = level
            ? `${CACHE_PREFIX}${type}_${level.toLowerCase()}`
            : `${CACHE_PREFIX}${type}`;

        keys.filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    } catch (err) {
        console.warn('Error clearing specific cache:', err);
    }
}

/**
 * Check if cache has valid content for a type/level
 * @param {string} type - Content type
 * @param {string} level - CEFR level
 * @param {string} theme - Optional theme
 * @returns {boolean}
 */
export function hasCachedContent(type, level, theme = '') {
    return getCachedContent(type, level, theme) !== null;
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        let totalSize = 0;
        const byType = {};

        keys.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                totalSize += item.length;
                const typeMatch = key.match(new RegExp(`^${CACHE_PREFIX}([^_]+)`));
                if (typeMatch) {
                    const type = typeMatch[1];
                    byType[type] = (byType[type] || 0) + 1;
                }
            }
        });

        return {
            totalEntries: keys.length,
            totalSizeKB: Math.round(totalSize / 1024),
            byType,
        };
    } catch (err) {
        console.warn('Error getting cache stats:', err);
        return { totalEntries: 0, totalSizeKB: 0, byType: {} };
    }
}
