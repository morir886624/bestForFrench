import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, History, Languages, Star, ChevronDown, ChevronUp, Brain, Dumbbell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import TranslationCard from "@/components/TranslationCard";
import LanguageSelector from "@/components/LanguageSelector";
import LiveTranslation from "@/components/LiveTranslation";
import VocabLevels from "@/components/VocabLevels";
import LearnTab from "@/components/LearnTab";
import GrammarTab from "@/components/GrammarTab";
import OfflineBanner from "@/components/OfflineBanner";
import AppHeader from "@/components/AppHeader";
import PullToRefresh from "@/components/PullToRefresh";
import ExportToSheetsButton from "@/components/ExportToSheetsButton";
import HomeDashboard from "@/components/HomeDashboard";
import WeakWordsPanel from "@/components/WeakWordsPanel";
import { saveToOfflineCache, searchOfflineCache, getAllOfflineCacheList } from "@/components/offlineCache";
import { useOnlineStatus, useInstallPrompt } from "@/components/usePWA";

// Map URL pathname → tab id
const PATH_TO_TAB = {
    '/': 'live',
    '/translate': 'live',
    '/vocab': 'vocab',
    '/learn': 'learn',
    '/grammar': 'grammar',
};
const TAB_TO_PATH = {
    live: '/translate',
    vocab: '/vocab',
    learn: '/learn',
    grammar: '/grammar',
};

export default function Home({ initialTab }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Derive active tab from URL, fallback to initialTab prop or 'live'
    const activeTab = PATH_TO_TAB[location.pathname] ?? initialTab ?? 'live';

    const setActiveTab = (tab) => {
        navigate(TAB_TO_PATH[tab] || '/translate', { replace: false });
    };

    const [word, setWord] = useState('');
    const [livePreview, setLivePreview] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewTimeout, setPreviewTimeout] = useState(null);
    const [sourceLanguage, setSourceLanguage] = useState('fr');
    const [targetLanguage, setTargetLanguage] = useState('fa');
    const [currentTranslation, setCurrentTranslation] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(true);
    const [appLang, setAppLang] = useState(() => localStorage.getItem('app_ui_lang') || 'fr');

    const isOnline = useOnlineStatus();
    const queryClient = useQueryClient();

    // Register service worker for PWA/offline
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    }, []);

    const { data: serverTranslations = [] } = useQuery({
        queryKey: ['translations'],
        queryFn: async () => {
            try {
                return await base44.entities.Translation.list('-created_date', 50);
            } catch (err) {
                console.log('Translation list error (likely not authenticated):', err);
                return [];
            }
        },
        enabled: isOnline,
    });

    // Merge server + offline cache; offline cache is the fallback when offline
    const recentTranslations = isOnline
        ? serverTranslations
        : getAllOfflineCacheList();

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Translation.create(data),
        onMutate: async (newData) => {
            await queryClient.cancelQueries({ queryKey: ['translations'] });
            const previous = queryClient.getQueryData(['translations']);
            queryClient.setQueryData(['translations'], (old = []) => [
                { ...newData, id: `optimistic-${Date.now()}`, created_date: new Date().toISOString() },
                ...old,
            ]);
            return { previous };
        },
        onError: (_err, _data, context) => {
            if (context?.previous) queryClient.setQueryData(['translations'], context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['translations'] });
        },
    });

    const languageNames = {
        fr: 'français',
        fa: 'persan',
        en: 'anglais',
        es: 'espagnol',
        de: 'allemand',
        it: 'italien',
        pt: 'portugais',
        ar: 'arabe',
        tr: 'turc',
        ru: 'russe',
        zh: 'chinois',
        ja: 'japonais',
    };

    const toggleAppLang = () => {
        const next = appLang === 'fr' ? 'fa' : 'fr';
        setAppLang(next);
        localStorage.setItem('app_ui_lang', next);
    };

    const t = {
        fr: {
            dict: 'Dictionnaire Persan', title: 'Traductor Persan', subtitle: 'Traduisez et apprenez le persan facilement',
            translate: 'Traduire', vocab: 'Vocabulaire', learn: 'Pratique', pratique: 'Pratique',
            history: 'Historique récent', placeholder: 'Entrez un mot à traduire...', translating: 'Traduction en cours...',
            tip: 'Tapez et voyez la traduction apparaître instantanément !', vocabTitle: 'Vocabulaire par niveau',
            vocabSub: 'Découvrez des mots français avec leur traduction et des phrases d\'exemple.',
        },
        fa: {
            dict: 'فرهنگ لغت فارسی', title: 'مترجم فارسی', subtitle: 'به آسانی فارسی یاد بگیرید و ترجمه کنید',
            translate: 'ترجمه', vocab: 'واژگان', learn: 'تمرین', pratique: 'تمرین',
            history: 'تاریخچه اخیر', placeholder: 'کلمه‌ای برای ترجمه وارد کنید...', translating: 'در حال ترجمه...',
            tip: 'تایپ کنید و ترجمه را فوری ببینید!', vocabTitle: 'واژگان بر اساس سطح',
            vocabSub: 'کلمات فرانسوی با ترجمه و جملات نمونه را کشف کنید.',
        }
    }[appLang];

    const swapLanguages = () => {
        setSourceLanguage(targetLanguage);
        setTargetLanguage(sourceLanguage);
    };

    const handleTranslate = async () => {
        if (!word.trim()) {
            toast.error("Veuillez entrer un mot");
            return;
        }

        setIsTranslating(true);
        setCurrentTranslation(null);

        // Offline: search cache first
        if (!isOnline) {
            const cached = searchOfflineCache(word.trim(), languageNames[sourceLanguage], languageNames[targetLanguage]);
            if (cached) {
                setCurrentTranslation(cached);
                toast.success("Résultat depuis le cache hors ligne !");
            } else {
                toast.error("Hors ligne — mot non trouvé dans le cache.");
            }
            setIsTranslating(false);
            setWord('');
            return;
        }

        let result;
        try {
            result = await base44.integrations.Core.InvokeLLM({
                prompt: `Traduis le mot/phrase "${word}" du ${languageNames[sourceLanguage]} vers le ${languageNames[targetLanguage]}.

Fournis:
1. La traduction (dans l'alphabet de la langue cible)
2. La prononciation (translittération si applicable)
3. Une définition courte en français

Réponds uniquement avec le JSON demandé.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        translation: { type: "string", description: "Traduction" },
                        pronunciation: { type: "string", description: "Prononciation/translittération" },
                        definition: { type: "string", description: "Définition en français" }
                    },
                    required: ["translation", "pronunciation", "definition"]
                }
            });
        } catch (err) {
            console.error("Translation error:", err);
            toast.error("Erreur de traduction. Verifiez votre connexion ou cle API.");
            setIsTranslating(false);
            return;
        }

        if (!result) {
            toast.error("Impossible d'obtenir la traduction.");
            setIsTranslating(false);
            return;
        }

        const translationData = {
            original_word: word.trim(),
            source_language: languageNames[sourceLanguage],
            target_language: languageNames[targetLanguage],
            persian_translation: result.translation,
            pronunciation: result.pronunciation,
            definition: result.definition
        };

        setCurrentTranslation(translationData);
        saveToOfflineCache(translationData); // always cache locally

        // Try to save to server (if authenticated), but don't block on failure
        try {
            await createMutation.mutateAsync(translationData);
            toast.success("Traduction enregistree !");
        } catch (err) {
            console.log('Could not save to server (guest mode?):', err);
            toast.success("Traduction enregistree localement !");
        }

        setIsTranslating(false);
        setWord('');
    };

    const handleWordChange = (e) => {
        const val = e.target.value;
        setWord(val);
        setLivePreview('');
        if (previewTimeout) clearTimeout(previewTimeout);
        if (!val.trim()) return;
        // Offline: check cache instantly
        if (!isOnline) {
            const cached = searchOfflineCache(val.trim(), languageNames[sourceLanguage], languageNames[targetLanguage]);
            if (cached) setLivePreview(cached.persian_translation || '');
            return;
        }
        setIsPreviewLoading(true);
        const timeoutId = setTimeout(async () => {
            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Traduis "${val}" du ${languageNames[sourceLanguage]} vers le ${languageNames[targetLanguage]}. Reponds UNIQUEMENT avec la traduction, rien d'autre.`,
                    response_json_schema: { type: "object", properties: { translation: { type: "string" } } }
                });
                setLivePreview(result?.translation || '');
            } catch (err) {
                console.error("Live preview error:", err);
                // Silent fail for live preview - don't show toast
            }
            setIsPreviewLoading(false);
        }, 600);
        setPreviewTimeout(timeoutId);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isTranslating) {
            handleTranslate();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/20 dark:from-background dark:via-background dark:to-background pb-20 lg:pb-0">
            <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet" />
            <OfflineBanner />
            <AppHeader appLang={appLang} onToggleLang={toggleAppLang} />

            <main className="px-4 pb-12">
                <div className="max-w-2xl mx-auto space-y-4">

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Desktop tabs */}
                        <TabsList className="hidden md:grid w-full grid-cols-4 h-14 bg-white/70 dark:bg-card backdrop-blur-sm rounded-xl p-1 shadow-lg mt-4">
                            <TabsTrigger value="live" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-xs font-medium">
                                <Languages className="h-4 w-4 mr-1" />{t.translate}
                            </TabsTrigger>
                            <TabsTrigger value="vocab" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-xs font-medium">
                                <Star className="h-4 w-4 mr-1" />{t.vocab}
                            </TabsTrigger>
                            <TabsTrigger value="grammar" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-xs font-medium">
                                <Brain className="h-4 w-4 mr-1" />Grammaire
                            </TabsTrigger>
                            <TabsTrigger value="learn" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg text-xs font-medium">
                                <Dumbbell className="h-4 w-4 mr-1" />{t.pratique}
                            </TabsTrigger>
                        </TabsList>



                        {/* Traduire Tab (anciennement Live) */}
                        <TabsContent value="live" className="space-y-6 mt-4">
                            <HomeDashboard />
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <LanguageSelector
                                    sourceLanguage={sourceLanguage}
                                    targetLanguage={targetLanguage}
                                    onSourceChange={setSourceLanguage}
                                    onTargetChange={setTargetLanguage}
                                    onSwap={swapLanguages}
                                />
                                <LiveTranslation
                                    sourceLanguage={sourceLanguage}
                                    targetLanguage={targetLanguage}
                                    languageNames={languageNames}
                                />
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 rounded-xl p-4 border border-amber-100 dark:border-amber-900/30">
                                    <p className="text-sm text-amber-700 flex items-center gap-2" style={appLang === 'fa' ? { fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' } : {}}>
                                        <Sparkles className="h-4 w-4 shrink-0" />
                                        {t.tip}
                                    </p>
                                </div>
                            </motion.div>

                            {/* Mots à revoir */}
                            <WeakWordsPanel />

                            {/* Historique en bas */}
                            {recentTranslations.length > 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => setHistoryOpen(o => !o)}
                                        className="flex-1 flex items-center justify-between gap-2 text-slate-600 hover:text-indigo-600 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <History className="h-5 w-5" />
                                            <h2 className="font-semibold" style={appLang === 'fa' ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}>{t.history}</h2>
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{recentTranslations.length}</span>
                                        </div>
                                        <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                                            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </button>
                                    <ExportToSheetsButton
                                        sheetName="Traductions"
                                        label="Exporter"
                                        rows={[
                                            ['Mot', 'Traduction', 'Prononciation', 'Définition', 'Langue source', 'Langue cible'],
                                            ...recentTranslations.map(tr => [tr.original_word, tr.persian_translation, tr.pronunciation || '', tr.definition || '', tr.source_language || '', tr.target_language || ''])
                                        ]}
                                    />
                                    </div>
                                    <AnimatePresence initial={false}>
                                        {historyOpen && (
                                            <motion.div
                                                key="history"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['translations'] })}>
                                                    <div className="grid gap-4 pt-1">
                                                        {recentTranslations.slice(0, 5).map((translation, index) => (
                                                            <motion.div
                                                                key={translation.id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.07 }}
                                                            >
                                                                <TranslationCard translation={translation} showDate />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </PullToRefresh>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </TabsContent>

                        {/* Vocab Tab */}
                        <TabsContent value="vocab" className="space-y-6 mt-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Star className="h-5 w-5 text-amber-500" />
                                    <h2 className="font-semibold" style={appLang === 'fa' ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}>{t.vocabTitle}</h2>
                                </div>
                                <p className="text-sm text-slate-500" style={appLang === 'fa' ? { fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' } : {}}>{t.vocabSub}</p>
                                <VocabLevels targetLanguage={targetLanguage} languageNames={languageNames} />
                            </motion.div>
                        </TabsContent>

                        {/* Pratique Tab (Quiz + Exercices fusionnés) */}
                        <TabsContent value="learn" className="mt-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <LearnTab translations={recentTranslations} targetLanguage={targetLanguage} languageNames={languageNames} appLang={appLang} />
                            </motion.div>
                        </TabsContent>

                        {/* Grammar Tab */}
                        <TabsContent value="grammar" className="mt-4">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <GrammarTab appLang={appLang} />
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}