import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { translateText as freeTranslate } from '@/api/llmService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SectionHistory from "@/components/history/SectionHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Languages, Shuffle, BookOpen, Target, Loader2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import SpeakButton from "@/components/SpeakButton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getCachedContent, setCachedContent } from "@/utils/aiContentCache";

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

const LEVEL_DESCRIPTIONS = {
    all: 'tous niveaux confondus, mélange A1 à C1',
    A1: 'A1 débutant — mots très simples du quotidien (bonjour, maison, eau, manger...)',
    A2: 'A2 élémentaire — expressions courantes et mots fréquents',
    B1: 'B1 intermédiaire — vocabulaire de conversation courante',
    B2: 'B2 avancé — expressions idiomatiques et vocabulaire riche',
    C1: 'C1 expert — vocabulaire soutenu, littéraire et technique',
};

// ── AI-Generated Exercise Set ──────────────────────────
function useAIExercises(level) {
    const [words, setWords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const generate = async (forceRefresh = false) => {
        setIsLoading(true);
        setError(null);
        setWords([]);

        // Check cache first
        if (!forceRefresh) {
            const cachedWords = getCachedContent('exercises', level);
            if (cachedWords && cachedWords.length > 0) {
                console.log('Using cached exercises for level:', level);
                // Convert cached format back to expected shape
                const normalized = cachedWords.map((p, i) => ({
                    id: `ai-${i}`,
                    original_word: p.fr,
                    persian_translation: p.fa,
                    pronunciation: p.pronunciation || '',
                }));
                setWords(normalized);
                setIsLoading(false);
                return;
            }
        }

        // Try OpenAI first if API key exists
        const apiKey = localStorage.getItem('app_api_key');
        if (apiKey) {
            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Genere exactement 10 paires de mots francais-persan de niveau ${level === 'all' ? 'varie (A1 a C1)' : level} (${LEVEL_DESCRIPTIONS[level] || ''}).
Chaque paire doit avoir :
- un mot francais adapte strictement au niveau ${level}
- sa traduction en persan (script persan)
- sa translitteration/prononciation

IMPORTANT : respecte strictement le niveau ${level}.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            pairs: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        fr: { type: "string" },
                                        fa: { type: "string" },
                                        pronunciation: { type: "string" }
                                    },
                                    required: ["fr", "fa"]
                                }
                            }
                        },
                        required: ["pairs"]
                    }
                });

                const normalized = (result?.pairs || []).map((p, i) => ({
                    id: `ai-${i}`,
                    original_word: p.fr,
                    persian_translation: p.fa,
                    pronunciation: p.pronunciation || '',
                }));
                if (normalized.length > 0) {
                    setWords(normalized);
                    if (result?.pairs) {
                        setCachedContent('exercises', level, '', result.pairs);
                    }
                    setIsLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Exercise generation error (falling back):", err);
            }
        }

        // Fallback: translate basic French words via free API
        try {
            const basicWords = ['Bonjour', 'Merci', 'Maison', 'Eau', 'Pain', 'Famille', 'Ami', 'Livre', 'Chat', 'Soleil'];
            const pairs = await Promise.all(
                basicWords.map(async (w) => {
                    const fa = await freeTranslate(w, 'Français', 'Persan').catch(() => '');
                    return { fr: w, fa, pronunciation: '' };
                })
            );
            const normalized = pairs.map((p, i) => ({
                id: `builtin-${i}`,
                original_word: p.fr,
                persian_translation: p.fa,
                pronunciation: p.pronunciation || '',
            }));
            setWords(normalized);
            if (!apiKey) {
                toast.info("Mode gratuit : exercices de base. Ajoutez une clé API pour plus de contenu.");
            }
        } catch (err) {
            console.error("Fallback exercise error:", err);
            toast.error("Erreur lors du chargement des exercices.");
            setError(err);
        }

        setIsLoading(false);
    };

    return { words, isLoading, error, generate };
}

// ── ReverseTranslationExercise ─────────────────────────
function ReverseTranslationExercise({ words, onResult }) {
    const [index, setIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState(null);
    const { speak, speakingKey } = useSpeech();

    if (index >= words.length) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                <div className="text-5xl">🎉</div>
                <h3 className="text-xl font-bold text-slate-800">Exercice terminé !</h3>
                <Button onClick={() => { setIndex(0); setFeedback(null); setUserInput(''); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <RotateCcw className="h-4 w-4 mr-2" /> Recommencer
                </Button>
            </motion.div>
        );
    }

    const current = words[index];

    const handleCheck = () => {
        if (!userInput.trim()) return;
        const correct = current.original_word.toLowerCase().trim();
        const answer = userInput.toLowerCase().trim();
        const isCorrect = correct === answer || correct.includes(answer) || answer.includes(correct);
        setFeedback(isCorrect ? 'correct' : 'wrong');
        onResult(isCorrect, isCorrect ? 15 : 0);
    };

    const handleNext = () => {
        setIndex(i => i + 1);
        setFeedback(null);
        setUserInput('');
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400">
                <span>Question {index + 1} / {words.length}</span>
                <span>{Math.round(((index + 1) / words.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div className="h-full bg-indigo-500 rounded-full" animate={{ width: `${((index + 1) / words.length) * 100}%` }} />
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-5 space-y-4">
                            <div className="text-center space-y-1">
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Persan → Français</Badge>
                                <p className="text-slate-500 text-xs mt-1">Traduisez ce mot en français :</p>
                                <div className="flex items-center justify-center gap-2 py-3">
                                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                        {current.persian_translation}
                                    </div>
                                    <SpeakButton text={current.persian_translation} lang="fa" speakFn={speak} activeKey={speakingKey} itemKey={`rev-${index}`} />
                                </div>
                                {current.pronunciation && (
                                    <p className="text-xs text-amber-600">/{current.pronunciation}/</p>
                                )}
                            </div>

                            {feedback === null ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={userInput}
                                        onChange={e => setUserInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCheck()}
                                        placeholder="Votre traduction en français..."
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button onClick={handleCheck} disabled={!userInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4">
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className={`rounded-xl p-3 text-center ${feedback === 'correct' ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200' : 'bg-red-50 dark:bg-red-900/30 border border-red-200'}`}>
                                        {feedback === 'correct' ? (
                                            <div className="flex items-center justify-center gap-2 text-emerald-700">
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="font-semibold">Correct ! +15 pts</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-center gap-2 text-red-600">
                                                    <XCircle className="h-5 w-5" />
                                                    <span className="font-semibold">Incorrect</span>
                                                </div>
                                                <p className="text-sm text-slate-600">Réponse : <strong>{current.original_word}</strong></p>
                                            </div>
                                        )}
                                    </div>
                                    <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                        {index + 1 >= words.length ? 'Terminer' : 'Question suivante'} →
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ── VocabQuizExercise ──────────────────────────────────
function VocabQuizExercise({ words, onResult }) {
    const [index, setIndex] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const { speak, speakingKey } = useSpeech();

    if (index >= words.length) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                <div className="text-5xl">🏆</div>
                <h3 className="text-xl font-bold text-slate-800">Quiz terminé !</h3>
                <Button onClick={() => { setIndex(0); setFeedback(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
                </Button>
            </motion.div>
        );
    }

    const current = words[index];
    const options = shuffle([current, ...shuffle(words.filter((_, i) => i !== index)).slice(0, 3)]);

    const handleAnswer = (choice) => {
        const isCorrect = choice.id === current.id;
        setFeedback({ isCorrect, chosenId: choice.id });
        onResult(isCorrect, isCorrect ? 10 : 0);
    };

    const handleNext = () => {
        setIndex(i => i + 1);
        setFeedback(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between text-xs text-slate-400">
                <span>Question {index + 1} / {words.length}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div className="h-full bg-purple-500 rounded-full" animate={{ width: `${((index + 1) / words.length) * 100}%` }} />
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                    <Card className="border-0 shadow-lg bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-5 space-y-4">
                            <div className="text-center space-y-1">
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">QCM Vocabulaire</Badge>
                                <p className="text-slate-500 text-xs mt-1">Quelle est la traduction française de :</p>
                                <div className="flex items-center justify-center gap-2 py-3">
                                    <div className="text-3xl font-bold text-slate-800" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                        {current.persian_translation}
                                    </div>
                                    <SpeakButton text={current.persian_translation} lang="fa" speakFn={speak} activeKey={speakingKey} itemKey={`mcq-${index}`} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {options.map((opt) => {
                                    let cls = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-secondary hover:bg-slate-50 text-slate-700 dark:text-slate-200';
                                    if (feedback) {
                                        if (opt.id === current.id) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700';
                                        else if (opt.id === feedback.chosenId && !feedback.isCorrect) cls = 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700';
                                        else cls = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-secondary text-slate-400 opacity-60';
                                    }
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => !feedback && handleAnswer(opt)}
                                            disabled={!!feedback}
                                            className={`rounded-xl border-2 p-3 text-sm font-medium transition-all text-center ${cls}`}
                                        >
                                            {opt.original_word}
                                        </button>
                                    );
                                })}
                            </div>

                            {feedback && (
                                <div className="space-y-2">
                                    <div className={`rounded-xl p-2 text-center text-sm font-semibold ${feedback.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                        {feedback.isCorrect ? '✓ Correct ! +10 pts' : `✗ Incorrect — Réponse : ${current.original_word}`}
                                    </div>
                                    <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                        {index + 1 >= words.length ? 'Terminer' : 'Suivant'} →
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ── PairsExercise ──────────────────────────────────────
function PairsExercise({ words, onResult }) {
    const items = words.slice(0, 6);
    const [leftSelected, setLeftSelected] = useState(null);
    const [rightSelected, setRightSelected] = useState(null);
    const [matched, setMatched] = useState([]);
    const [wrong, setWrong] = useState([]);
    const [done, setDone] = useState(false);
    const [rights] = useState(() => shuffle(items));

    useEffect(() => {
        if (leftSelected && rightSelected) {
            const isMatch = leftSelected.id === rightSelected.id;
            if (isMatch) {
                const newMatched = [...matched, leftSelected.id];
                setMatched(newMatched);
                onResult(true, 12);
                if (newMatched.length === items.length) setTimeout(() => setDone(true), 400);
            } else {
                setWrong([leftSelected.id + '-L', rightSelected.id + '-R']);
                onResult(false, 0);
                setTimeout(() => setWrong([]), 800);
            }
            setLeftSelected(null);
            setRightSelected(null);
        }
    }, [leftSelected, rightSelected]);

    if (done) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                <div className="text-5xl">🎯</div>
                <h3 className="text-xl font-bold text-slate-800">Toutes les paires trouvées !</h3>
                <Button onClick={() => { setMatched([]); setDone(false); setLeftSelected(null); setRightSelected(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
                </Button>
            </motion.div>
        );
    }

    const btnBase = 'rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all text-center min-h-[44px] flex items-center justify-center';

    return (
        <div className="space-y-4">
            <div className="text-center">
                <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs">Jeu de paires</Badge>
                <p className="text-xs text-slate-500 mt-1">Associez chaque mot français à sa traduction persane</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    {items.map(item => {
                        const isMatched = matched.includes(item.id);
                        const isSelected = leftSelected?.id === item.id;
                        const isWrong = wrong.includes(item.id + '-L');
                        let cls = 'border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 cursor-pointer';
                        if (isMatched) cls = 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60 cursor-default';
                        else if (isSelected) cls = 'border-indigo-500 bg-indigo-50 text-indigo-700';
                        else if (isWrong) cls = 'border-red-400 bg-red-50 text-red-600 animate-pulse';
                        return (
                            <button key={item.id} disabled={isMatched} onClick={() => !isMatched && setLeftSelected(item)} className={`${btnBase} ${cls} w-full`}>
                                {item.original_word}
                            </button>
                        );
                    })}
                </div>
                <div className="space-y-2">
                    {rights.map(item => {
                        const isMatched = matched.includes(item.id);
                        const isSelected = rightSelected?.id === item.id;
                        const isWrong = wrong.includes(item.id + '-R');
                        let cls = 'border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-700 cursor-pointer';
                        if (isMatched) cls = 'border-emerald-300 bg-emerald-50 text-emerald-700 opacity-60 cursor-default';
                        else if (isSelected) cls = 'border-amber-500 bg-amber-50 text-amber-700';
                        else if (isWrong) cls = 'border-red-400 bg-red-50 text-red-600 animate-pulse';
                        return (
                            <button key={item.id} disabled={isMatched} onClick={() => !isMatched && setRightSelected(item)} className={`${btnBase} ${cls} w-full`} dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                {item.persian_translation}
                            </button>
                        );
                    })}
                </div>
            </div>
            <p className="text-center text-xs text-slate-400">{matched.length}/{items.length} paires trouvées • +12 pts par paire</p>
        </div>
    );
}

// ── Main ExercisesTab ──────────────────────────────────
export default function ExercisesTab({ appLang, level = 'all' }) {
    const [currentUser, setCurrentUser] = useState(null);
    const queryClient = useQueryClient();
    const isFa = appLang === 'fa';
    const fontStyle = isFa ? { fontFamily: 'Vazirmatn, sans-serif' } : {};

    const { words, isLoading, generate } = useAIExercises(level);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    // Auto-generate on mount or level change
    useEffect(() => {
        generate();
    }, [level]);

    const { data: progressList = [] } = useQuery({
        queryKey: ['userProgress', currentUser?.email],
        queryFn: () => base44.entities.UserProgress.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });
    const progress = progressList[0] || null;

    const updateProgressMutation = useMutation({
        mutationFn: async ({ isCorrect, pts }) => {
            if (!currentUser) return;
            const base = {
                user_email: currentUser.email,
                display_name: currentUser.full_name || currentUser.email?.split('@')[0],
                exercises_done: (progress?.exercises_done || 0) + 1,
                exercises_correct: (progress?.exercises_correct || 0) + (isCorrect ? 1 : 0),
                exercises_total: (progress?.exercises_total || 0) + 1,
                exercises_points: (progress?.exercises_points || 0) + pts,
                total_points: (progress?.total_points || 0) + pts,
                correct_answers: (progress?.correct_answers || 0) + (isCorrect ? 1 : 0),
                total_answers: (progress?.total_answers || 0) + 1,
                streak: progress?.streak || 0,
                best_streak: progress?.best_streak || 0,
                badges: progress?.badges || [],
                sessions_count: progress?.sessions_count || 0,
            };
            if (progress?.id) return base44.entities.UserProgress.update(progress.id, base);
            return base44.entities.UserProgress.create(base);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProgress', currentUser?.email] });
            queryClient.invalidateQueries({ queryKey: ['user-progress'] });
        },
    });

    const handleResult = (isCorrect, pts) => {
        updateProgressMutation.mutate({ isCorrect, pts });
        if (isCorrect && pts > 0) toast.success(`+${pts} pts !`, { duration: 1200 });
    };

    const exDone = progress?.exercises_done || 0;
    const exCorrect = progress?.exercises_correct || 0;
    const exTotal = progress?.exercises_total || 0;
    const exPts = progress?.exercises_points || 0;
    const exAccuracy = exTotal > 0 ? Math.round((exCorrect / exTotal) * 100) : 0;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm">Génération des exercices niveau <strong>{level}</strong>...</p>
            </div>
        );
    }

    if (words.length === 0) {
        return (
            <div className="text-center py-10 space-y-3">
                <p className="text-slate-400 text-sm">Impossible de charger les exercices.</p>
                <Button onClick={generate} variant="outline" className="border-indigo-200 text-indigo-600">
                    <RotateCcw className="h-4 w-4 mr-2" /> Réessayer
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Refresh button */}
            <div className="flex justify-end">
                <Button onClick={generate} disabled={isLoading} size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Nouveaux exercices
                </Button>
            </div>

            <Tabs defaultValue="reverse">
                <TabsList className="grid grid-cols-3 h-10 bg-slate-100 dark:bg-secondary rounded-xl p-1">
                    <TabsTrigger value="reverse" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Languages className="h-3.5 w-3.5 mr-1" />{isFa ? 'معکوس' : 'Inversé'}
                    </TabsTrigger>
                    <TabsTrigger value="mcq" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Target className="h-3.5 w-3.5 mr-1" />QCM
                    </TabsTrigger>
                    <TabsTrigger value="pairs" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Shuffle className="h-3.5 w-3.5 mr-1" />{isFa ? 'جفت‌ها' : 'Paires'}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reverse" className="mt-4">
                    <ReverseTranslationExercise words={words} onResult={handleResult} key={`reverse-${words[0]?.id}`} />
                </TabsContent>
                <TabsContent value="mcq" className="mt-4">
                    <VocabQuizExercise words={words} onResult={handleResult} key={`mcq-${words[0]?.id}`} />
                </TabsContent>
                <TabsContent value="pairs" className="mt-4">
                    <PairsExercise words={words} onResult={handleResult} key={`pairs-${words[0]?.id}`} />
                </TabsContent>
            </Tabs>

            {/* Stats banner */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-0 shadow-md bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <CardContent className="p-3 grid grid-cols-3 divide-x divide-indigo-100 dark:divide-indigo-900/50 text-center">
                        <div className="px-2">
                            <div className="text-lg font-bold text-indigo-700">{exDone}</div>
                            <div className="text-xs text-slate-500" style={fontStyle}>{isFa ? 'تمرین‌ها' : 'Exercices'}</div>
                        </div>
                        <div className="px-2">
                            <div className="text-lg font-bold text-emerald-600">{exAccuracy}%</div>
                            <div className="text-xs text-slate-500" style={fontStyle}>{isFa ? 'دقت' : 'Précision'}</div>
                        </div>
                        <div className="px-2">
                            <div className="text-lg font-bold text-purple-600">{exPts}</div>
                            <div className="text-xs text-slate-500" style={fontStyle}>{isFa ? 'امتیاز' : 'Points'}</div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {currentUser && <SectionHistory section="quiz" userEmail={currentUser.email} />}
        </div>
    );
}