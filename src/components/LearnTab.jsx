import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookMarked, Trophy, Zap, GraduationCap, Flame, Target, ChevronRight, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { BADGES, checkNewBadges } from "@/components/gamification/GamificationPanel";
import Leaderboard from "@/components/gamification/Leaderboard";
import FlashcardQuiz from "@/components/gamification/FlashcardQuiz";
import VocabListManager from "@/components/vocab/VocabListManager";
import QuizCard from "@/components/QuizCard";
import ExercisesTab from "@/components/exercises/ExercisesTab";
import TimedChallenge from "@/components/exercises/TimedChallenge";
import SectionHistory from "@/components/history/SectionHistory";

const LEVELS = [
    { id: 'all', label: 'Tous', emoji: '🌍', desc: 'Tous les niveaux' },
    { id: 'A1', label: 'A1', emoji: '🌱', desc: 'Débutant' },
    { id: 'A2', label: 'A2', emoji: '🌿', desc: 'Élémentaire' },
    { id: 'B1', label: 'B1', emoji: '📗', desc: 'Intermédiaire' },
    { id: 'B2', label: 'B2', emoji: '📘', desc: 'Avancé' },
    { id: 'C1', label: 'C1', emoji: '🏆', desc: 'Expert' },
];

export default function LearnTab({ translations, targetLanguage, languageNames, appLang }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedListForQuiz, setSelectedListForQuiz] = useState(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const { data: progressList = [] } = useQuery({
        queryKey: ['userProgress', currentUser?.email],
        queryFn: () => currentUser ? base44.entities.UserProgress.filter({ user_email: currentUser.email }) : [],
        enabled: !!currentUser,
    });

    const progress = progressList[0] || null;

    const { data: vocabLists = [] } = useQuery({
        queryKey: ['vocabLists'],
        queryFn: () => base44.entities.VocabList.list('-created_date'),
    });

    const updateProgressMutation = useMutation({
        mutationFn: async ({ pts, correct }) => {
            if (!currentUser) return;
            const newStreak = correct ? (progress?.streak || 0) + 1 : 0;
            const newBestStreak = Math.max(newStreak, progress?.best_streak || 0);
            const updatedData = {
                user_email: currentUser.email,
                display_name: currentUser.full_name || currentUser.email?.split('@')[0],
                total_points: (progress?.total_points || 0) + pts,
                correct_answers: (progress?.correct_answers || 0) + (correct ? 1 : 0),
                total_answers: (progress?.total_answers || 0) + 1,
                streak: newStreak,
                best_streak: newBestStreak,
                badges: progress?.badges || [],
            };
            const newBadgeIds = checkNewBadges(updatedData);
            if (newBadgeIds.length > 0) {
                updatedData.badges = [...(progress?.badges || []), ...newBadgeIds];
                newBadgeIds.forEach(id => {
                    const badge = BADGES.find(b => b.id === id);
                    if (badge) toast.success(`Badge débloqué : ${badge.icon} ${badge.label} !`, { duration: 3000 });
                });
            }
            if (progress?.id) {
                return base44.entities.UserProgress.update(progress.id, updatedData);
            } else {
                return base44.entities.UserProgress.create(updatedData);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProgress', currentUser?.email] }),
    });

    const handleScoreUpdate = (pts) => {
        updateProgressMutation.mutate({ pts, correct: pts > 0 });
    };

    const listsWithWords = vocabLists.filter(l => (l.words || []).length >= 2);

    // Quick training: pick random words from translation history
    const handleQuickTraining = () => {
        const pool = translations.filter(t => t.original_word && t.persian_translation);
        if (pool.length < 2) {
            toast.error("Traduisez au moins 2 mots pour lancer un entraînement rapide !");
            return;
        }
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
        const quickList = {
            id: 'quick-training',
            name: '⚡ Entraînement rapide',
            words: shuffled.map(t => ({
                original: t.original_word,
                translation: t.persian_translation,
                pronunciation: t.pronunciation || '',
                definition: t.definition || '',
            })),
        };
        setSelectedListForQuiz(quickList);
    };

    // Level selection screen
    if (!selectedLevel) {
        return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="text-center py-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Choisissez votre niveau</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Les exercices s'adapteront à votre sélection</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {LEVELS.map((level, i) => (
                        <motion.button
                            key={level.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedLevel(level)}
                            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                        >
                            <span className="text-2xl">{level.emoji}</span>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{level.label}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{level.desc}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 ml-auto" />
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        );
    }

    // Practice screen (after level selected)
    return (
        <div className="space-y-4">
            {/* Level header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => { setSelectedLevel(null); setSelectedListForQuiz(null); }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-secondary hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-500 dark:text-slate-400 transition-colors"
                >
                    ← 
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedLevel.emoji}</span>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{selectedLevel.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLevel.desc}</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="quiz">
                <TabsList className="grid grid-cols-5 h-10 bg-slate-100 dark:bg-secondary rounded-xl p-1">
                    <TabsTrigger value="quiz" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <GraduationCap className="h-3.5 w-3.5 mr-1" />Quiz
                    </TabsTrigger>
                    <TabsTrigger value="exercises" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Target className="h-3.5 w-3.5 mr-1" />Exos
                    </TabsTrigger>
                    <TabsTrigger value="timed" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Zap className="h-3.5 w-3.5 mr-1" />Défi
                    </TabsTrigger>
                    <TabsTrigger value="flashcards" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Flame className="h-3.5 w-3.5 mr-1" />Flash
                    </TabsTrigger>
                    <TabsTrigger value="ranking" className="data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs font-medium">
                        <Trophy className="h-3.5 w-3.5 mr-1" />Rang
                    </TabsTrigger>
                </TabsList>

                {/* Quiz */}
                <TabsContent value="quiz" className="mt-4 space-y-4">
                    <QuizCard onScoreUpdate={handleScoreUpdate} level={selectedLevel.id} />
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/40">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Niveau {selectedLevel.label} • +10 pts par bonne réponse
                        </p>
                    </div>
                    {currentUser && <SectionHistory section="quiz" userEmail={currentUser.email} />}
                </TabsContent>

                {/* Exercices */}
                <TabsContent value="exercises" className="mt-4">
                    <ExercisesTab translations={translations} appLang={appLang} level={selectedLevel.id} />
                </TabsContent>

                {/* Défi Chronométré */}
                <TabsContent value="timed" className="mt-4">
                    <TimedChallenge level={selectedLevel.id} onResult={handleScoreUpdate} />
                </TabsContent>

                {/* Flashcards */}
                <TabsContent value="flashcards" className="mt-4 space-y-4">
                    {(listsWithWords.length > 0 || translations.filter(t => t.original_word && t.persian_translation).length >= 1) && (
                        <>
                            {!selectedListForQuiz ? (
                                <div className="space-y-3">
                                    {/* Quick training button */}
                                    {translations.filter(t => t.original_word && t.persian_translation).length >= 2 && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={handleQuickTraining}
                                            className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:border-indigo-400 transition-all text-left group"
                                        >
                                            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 group-hover:bg-indigo-200 transition-colors">
                                                <Shuffle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">Entraînement rapide</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">10 mots aléatoires depuis votre historique</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-indigo-400 group-hover:text-indigo-600" />
                                        </motion.button>
                                    )}
                                    {listsWithWords.length > 0 && (
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Ou choisissez une liste :</p>
                                    )}
                                    {listsWithWords.map(list => (
                                        <Button key={list.id} variant="outline" className="w-full justify-between h-auto py-3"
                                            onClick={() => setSelectedListForQuiz(list)}>
                                            <span>{list.name} <span className="text-slate-400 text-xs ml-1">({list.words.length} mots)</span></span>
                                            <Zap className="h-4 w-4 text-indigo-500" />
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedListForQuiz(null)} className="text-slate-500">← Retour</Button>
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedListForQuiz.name}</span>
                                    </div>
                                    <FlashcardQuiz words={selectedListForQuiz.words} onScoreUpdate={handleScoreUpdate} />
                                </div>
                            )}
                        </>
                    )}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <Flame className="h-3.5 w-3.5" />
                            +10 pts flashcard connue • +15 pts bonne réponse QCM
                        </p>
                    </div>
                </TabsContent>

                {/* Leaderboard */}
                <TabsContent value="ranking" className="mt-4">
                    <Leaderboard currentUserEmail={currentUser?.email} />
                </TabsContent>
            </Tabs>
        </div>
    );
}