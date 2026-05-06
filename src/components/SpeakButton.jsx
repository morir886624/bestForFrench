import React from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SpeakButton
 * Props:
 *   text        — text to speak
 *   lang        — language code (e.g. 'fa', 'fr', 'persan')
 *   speakFn     — speak(text, lang, key) from useSpeech
 *   activeKey   — speakingKey from useSpeech
 *   itemKey     — unique key for this item (defaults to text)
 *   size        — 'sm' | 'md' (default 'md')
 *   className   — extra classes
 */
export default function SpeakButton({ text, lang = 'fa', speakFn, activeKey, itemKey, size = 'md', className }) {
    const key = itemKey ?? text;
    const isActive = activeKey === key;

    const handleClick = (e) => {
        e.stopPropagation();
        speakFn(text, lang, key);
    };

    return (
        <button
            onClick={handleClick}
            title="Écouter la prononciation"
            aria-label="Écouter la prononciation"
            className={cn(
                'flex items-center justify-center rounded-lg transition-all shrink-0',
                size === 'sm' ? 'p-1 h-6 w-6' : 'p-1.5 h-8 w-8',
                isActive
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 scale-110'
                    : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
                className
            )}
        >
            <Volume2
                className={cn(
                    size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
                    isActive && 'animate-pulse'
                )}
            />
        </button>
    );
}