import { useState, useCallback, useEffect } from 'react';

// Language code → BCP-47 tag
const LANG_MAP = {
    fa: 'fa-IR',
    ar: 'ar-SA',
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-PT',
    tr: 'tr-TR',
    ru: 'ru-RU',
    zh: 'zh-CN',
    ja: 'ja-JP',
    persan: 'fa-IR',
    arabe: 'ar-SA',
    français: 'fr-FR',
    anglais: 'en-US',
};

function getLangCode(lang) {
    if (!lang) return 'fr-FR';
    const lower = lang.toLowerCase();
    return LANG_MAP[lower] || LANG_MAP[lang] || 'fr-FR';
}

/**
 * useSpeech — centralised TTS hook.
 * Returns: { speak, speaking, speakingKey }
 *   speak(text, lang, key?)  — speak text in given language; key identifies which item is playing
 *   speaking                 — boolean: TTS is active
 *   speakingKey              — the key passed to speak(), useful to highlight the active item
 */
export function useSpeech() {
    const [speakingKey, setSpeakingKey] = useState(null);

    // Stop on unmount
    useEffect(() => {
        return () => {
            if (typeof speechSynthesis !== 'undefined') {
                speechSynthesis.cancel();
            }
        };
    }, []);

    const speak = useCallback((text, lang = 'fa', key = text) => {
        if (typeof speechSynthesis === 'undefined') return;
        speechSynthesis.cancel();
        setSpeakingKey(null);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getLangCode(lang);
        utterance.rate = 0.9;

        utterance.onstart = () => setSpeakingKey(key);
        utterance.onend = () => setSpeakingKey(null);
        utterance.onerror = () => setSpeakingKey(null);

        speechSynthesis.speak(utterance);
    }, []);

    const stop = useCallback(() => {
        if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
        setSpeakingKey(null);
    }, []);

    return {
        speak,
        stop,
        speaking: speakingKey !== null,
        speakingKey,
    };
}