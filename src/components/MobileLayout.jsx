import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Languages, Star, Dumbbell, Brain, UserCircle } from 'lucide-react';

const TAB_TO_PATH = {
    live: '/translate',
    vocab: '/vocab',
    learn: '/learn',
    grammar: '/grammar',
    profile: '/profile',
};

const PATH_TO_TAB = {
    '/': 'live',
    '/translate': 'live',
    '/vocab': 'vocab',
    '/learn': 'learn',
    '/grammar': 'grammar',
    '/profile': 'profile',
    '/dashboard': 'profile',
    '/settings': 'profile',
};

const TABS = [
    { id: 'live', icon: Languages, labelFr: 'Traduire', labelFa: 'ترجمه' },
    { id: 'vocab', icon: Star, labelFr: 'Vocab', labelFa: 'واژگان' },
    { id: 'grammar', icon: Brain, labelFr: 'Grammaire', labelFa: 'دستور' },
    { id: 'learn', icon: Dumbbell, labelFr: 'Pratique', labelFa: 'تمرین' },
    { id: 'profile', icon: UserCircle, labelFr: 'Profil', labelFa: 'پروفایل' },
];

// Pages where the bottom nav should be visible
const NAV_PATHS = new Set(['/', '/translate', '/vocab', '/learn', '/grammar', '/profile', '/dashboard', '/settings']);

export default function MobileLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const appLang = localStorage.getItem('app_ui_lang') || 'fr';

    const activeTab = PATH_TO_TAB[location.pathname] ?? null;
    const showNav = NAV_PATHS.has(location.pathname);

    if (!showNav) return <>{children}</>;

    return (
        <>
            {children}
            {/* Mobile bottom nav — hidden on lg+ */}
            <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-white/95 dark:bg-[#13131a]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-2xl"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="grid grid-cols-5 h-16 max-w-2xl mx-auto relative">
                    {TABS.map(({ id, icon: Icon, labelFr, labelFa }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => navigate(TAB_TO_PATH[id])}
                                className={`flex flex-col items-center justify-center gap-1 transition-all ${
                                    isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                                <span
                                    className="text-xs font-medium"
                                    style={appLang === 'fa' ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                                >
                                    {appLang === 'fa' ? labelFa : labelFr}
                                </span>
                                {isActive && (
                                    <div className="absolute bottom-0 w-8 h-0.5 bg-indigo-600 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}