import React from 'react';
import { Globe, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function AppHeader({ appLang, onToggleLang }) {
    const { isDark, toggle } = useTheme();

    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {appLang === 'fa' ? 'مترجم' : 'Traductor'}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggle}
                        aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                        title={isDark ? 'Mode clair' : 'Mode sombre'}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={onToggleLang}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        <Globe className="h-4 w-4 text-indigo-500" />
                        {appLang === 'fr' ? 'فارسی' : 'Français'}
                    </button>
                </div>
            </div>
        </header>
    );
}