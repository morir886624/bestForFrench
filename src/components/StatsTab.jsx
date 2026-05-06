import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Languages, BookOpen, TrendingUp, Award, Zap, Target, Dumbbell, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import GamificationPanel from "@/components/gamification/GamificationPanel";

function StatCard({ icon: Icon, value, label, color, delay = 0 }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
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

export default function StatsTab({ translations, appLang }) {
    const { data: user } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me(),
    });

    const { data: progressList = [] } = useQuery({
        queryKey: ['user-progress', user?.email],
        queryFn: () => base44.entities.UserProgress.filter({ user_email: user.email }),
        enabled: !!user?.email,
    });

    const progress = progressList[0] || {};

    // Compute language pairs from translations
    const pairCounts = {};
    translations.forEach(t => {
        if (t.source_language && (t.persian_translation || t.target_language)) {
            const pair = `${t.source_language} → ${t.target_language || 'persan'}`;
            pairCounts[pair] = (pairCounts[pair] || 0) + 1;
        }
    });
    const topPairs = Object.entries(pairCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Recent 5 unique words
    const recentWords = translations.slice(0, 5);

    const accuracy = progress.total_answers > 0
        ? Math.round((progress.correct_answers / progress.total_answers) * 100)
        : 0;

    const exAccuracy = (progress.exercises_total || 0) > 0
        ? Math.round(((progress.exercises_correct || 0) / progress.exercises_total) * 100)
        : 0;

    const isFa = appLang === 'fa';
    const fontStyle = isFa ? { fontFamily: 'Vazirmatn, sans-serif' } : {};

    return (
        <div className="space-y-6">
            {/* Gamification panel */}
            {Object.keys(progress).length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <GamificationPanel progress={progress} />
                </motion.div>
            )}

            {/* Overview stats */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Languages} value={translations.length} label={isFa ? 'کلمات ترجمه‌شده' : 'Mots traduits'} color="bg-indigo-100 text-indigo-600" delay={0} />
                <StatCard icon={Target} value={`${accuracy}%`} label={isFa ? 'دقت در آزمون' : 'Précision quiz'} color="bg-emerald-100 text-emerald-600" delay={0.05} />
                <StatCard icon={Zap} value={progress.streak || 0} label={isFa ? 'روزهای متوالی' : 'Jours de série'} color="bg-amber-100 text-amber-600" delay={0.1} />
                <StatCard icon={Award} value={progress.total_points || 0} label={isFa ? 'امتیاز کل' : 'Points totaux'} color="bg-purple-100 text-purple-600" delay={0.15} />
            </div>

            {/* Most frequent language pairs */}
            {topPairs.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-600">
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                        <h3 className="font-semibold text-sm" style={fontStyle}>
                            {isFa ? 'پرکاربردترین زوج زبان‌ها' : 'Paires de langues fréquentes'}
                        </h3>
                    </div>
                    <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                        <CardContent className="p-4 space-y-2">
                            {topPairs.map(([pair, count]) => (
                                <div key={pair} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-700">{pair}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 rounded-full bg-indigo-200 overflow-hidden" style={{ width: 80 }}>
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${Math.min(100, (count / translations.length) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Recently learned words */}
            {recentWords.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-600">
                        <BookOpen className="h-4 w-4 text-amber-500" />
                        <h3 className="font-semibold text-sm" style={fontStyle}>
                            {isFa ? 'آخرین کلمات یاد گرفته' : 'Derniers mots appris'}
                        </h3>
                    </div>
                    <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                        <CardContent className="p-4 space-y-2">
                            {recentWords.map((tr) => (
                                <div key={tr.id} className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-slate-700">{tr.original_word}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs text-slate-400">{tr.source_language || 'fr'}</Badge>
                                        <span
                                            className="text-sm text-indigo-700 font-medium"
                                            dir={['fa', 'ar'].includes(tr.target_language) ? 'rtl' : 'ltr'}
                                            style={{ fontFamily: 'Vazirmatn, sans-serif' }}
                                        >
                                            {tr.persian_translation}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Exercises stats */}
            {(progress.exercises_done > 0) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Dumbbell className="h-4 w-4 text-purple-500" />
                        <h3 className="font-semibold text-sm" style={fontStyle}>
                            {isFa ? 'پیشرفت تمرین‌ها' : 'Progression des exercices'}
                        </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-indigo-700">{progress.exercises_done || 0}</div>
                                <div className="text-xs text-slate-500" style={fontStyle}>{isFa ? 'تمرین‌ها' : 'Exercices'}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-emerald-600">{exAccuracy}%</div>
                                <div className="text-xs text-slate-500" style={fontStyle}>{isFa ? 'دقت' : 'Précision'}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-purple-600">{progress.exercises_points || 0}</div>
                                <div className="text-xs text-slate-500" style={fontStyle}>{isFa ? 'امتیاز' : 'Points'}</div>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            )}

            {translations.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Languages className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm" style={fontStyle}>
                        {isFa ? 'هنوز کلمه‌ای ترجمه نشده است.' : 'Aucune traduction encore. Commencez à traduire !'}
                    </p>
                </div>
            )}
        </div>
    );
}