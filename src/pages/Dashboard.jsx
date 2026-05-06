import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Languages, Target, Zap, Award, BookOpen, Star, Brain, ArrowLeft } from "lucide-react";
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, value, label, color, delay = 0 }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card className="border-0 shadow-md bg-white/80 dark:bg-card backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${color}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800">{value}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function Dashboard() {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const { data: translations = [] } = useQuery({
        queryKey: ['translations'],
        queryFn: () => base44.entities.Translation.list('-created_date', 100),
    });

    const { data: progressList = [] } = useQuery({
        queryKey: ['user-progress-dash', currentUser?.email],
        queryFn: () => base44.entities.UserProgress.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });

    const { data: sessionHistory = [] } = useQuery({
        queryKey: ['session-history-dash', currentUser?.email],
        queryFn: () => base44.entities.SessionHistory.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });

    const { data: vocabLists = [] } = useQuery({
        queryKey: ['vocabLists-dash'],
        queryFn: () => base44.entities.VocabList.list('-created_date'),
    });

    const progress = progressList[0] || {};

    const accuracy = progress.total_answers > 0
        ? Math.round((progress.correct_answers / progress.total_answers) * 100)
        : 0;

    const quizHistory = sessionHistory.filter(s => s.section === 'quiz');
    const vocabHistory = sessionHistory.filter(s => s.section === 'vocab');
    const grammarHistory = sessionHistory.filter(s => s.section === 'grammar');

    const correctQuiz = quizHistory.filter(s => s.quiz_result === 'correct').length;
    const quizAccuracy = quizHistory.length > 0 ? Math.round((correctQuiz / quizHistory.length) * 100) : 0;

    // Recent activity (last 5 session items)
    const recentActivity = [...sessionHistory]
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 5);

    const sectionColors = {
        vocab: 'bg-amber-100 text-amber-700',
        quiz: 'bg-indigo-100 text-indigo-700',
        grammar: 'bg-green-100 text-green-700',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/20 dark:from-background dark:via-background dark:to-background pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet" />

            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#13131a]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
                    <Link to="/" className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors">
                        <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </Link>
                    <h1 className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Tableau de bord
                    </h1>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
                {/* Welcome */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
                        <p className="text-indigo-200 text-sm mb-1">Bienvenue 👋</p>
                        <h2 className="text-xl font-bold">{currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Apprenant'}</h2>
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-4 w-4 text-amber-300" />
                                <span className="text-sm font-semibold">{progress.streak || 0} jours de série</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-amber-300" />
                                <span className="text-sm font-semibold">{progress.total_points || 0} pts</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats grid */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Statistiques globales</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={Languages} value={translations.length} label="Mots traduits" color="bg-indigo-100 text-indigo-600" delay={0} />
                        <StatCard icon={Target} value={`${quizAccuracy}%`} label="Précision Quiz" color="bg-emerald-100 text-emerald-600" delay={0.05} />
                        <StatCard icon={BookOpen} value={vocabHistory.length} label="Mots en Vocab" color="bg-amber-100 text-amber-600" delay={0.1} />
                        <StatCard icon={Brain} value={grammarHistory.length} label="Exercices Grammaire" color="bg-purple-100 text-purple-600" delay={0.15} />
                    </div>
                </div>

                {/* Progress overview */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Progression par section</h3>
                    <Card className="border-0 shadow-md bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-4 space-y-4">
                            {[
                                { label: 'Quiz', value: quizHistory.length, correct: correctQuiz, color: 'bg-indigo-500', icon: Target },
                                { label: 'Vocabulaire', value: vocabHistory.length, correct: vocabHistory.length, color: 'bg-amber-500', icon: Star },
                                { label: 'Grammaire', value: grammarHistory.length, correct: grammarHistory.length, color: 'bg-green-500', icon: Brain },
                            ].map(({ label, value, correct, color, icon: Icon }) => (
                                <div key={label} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
                                    </div>
                                    <span className="text-slate-400 dark:text-slate-500 text-xs">{value} sessions</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${color} rounded-full`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${value > 0 ? Math.min(100, (value / Math.max(quizHistory.length, vocabHistory.length, grammarHistory.length, 1)) * 100) : 0}%` }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent activity */}
                {recentActivity.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Activité récente</h3>
                        <Card className="border-0 shadow-md bg-white/80 dark:bg-card backdrop-blur-sm">
                            <CardContent className="p-4 space-y-3">
                                {recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Badge className={`${sectionColors[item.section]} border-0 text-xs shrink-0 capitalize`}>
                                                {item.section}
                                            </Badge>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.word_original}</span>
                                            <span className="text-sm text-slate-400 shrink-0" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                                {item.word_translation}
                                            </span>
                                        </div>
                                        {item.quiz_result && (
                                            <span className={`text-xs font-semibold shrink-0 ${item.quiz_result === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {item.quiz_result === 'correct' ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Vocab lists */}
                {vocabLists.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Listes de vocabulaire</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {vocabLists.slice(0, 4).map(list => (
                                <Card key={list.id} className="border-0 shadow-sm bg-white/80 dark:bg-card">
                                    <CardContent className="p-3">
                                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{list.name}</p>
                                        <p className="text-xs text-slate-400">{(list.words || []).length} mots</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Badges */}
                {(progress.badges || []).length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Badges obtenus</h3>
                        <div className="flex flex-wrap gap-2">
                            {progress.badges.map(badge => (
                                <Badge key={badge} className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">
                                    {badge}
                                </Badge>
                            ))}
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}