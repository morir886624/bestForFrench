import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Languages, Target, Flame, BookOpen, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HomeDashboard() {
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const { data: translations = [] } = useQuery({
        queryKey: ['translations'],
        queryFn: () => base44.entities.Translation.list('-created_date', 200),
    });

    const { data: progressList = [] } = useQuery({
        queryKey: ['userProgress', currentUser?.email],
        queryFn: () => base44.entities.UserProgress.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });

    const { data: sessionHistory = [] } = useQuery({
        queryKey: ['session-history-dash', currentUser?.email],
        queryFn: () => base44.entities.SessionHistory.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });

    const progress = progressList[0] || {};

    // Total unique words learned (translations + vocab sessions)
    const vocabWords = sessionHistory.filter(s => s.section === 'vocab').length;
    const totalWords = translations.length + vocabWords;

    // Build last 7 days chart data
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = translations.filter(t => t.created_date?.startsWith(dayStr)).length;
        return { day: format(day, 'EEE', { locale: fr }), mots: count };
    });

    const accuracy = progress.total_answers > 0
        ? Math.round((progress.correct_answers / progress.total_answers) * 100)
        : 0;

    const grammarDone = sessionHistory.filter(s => s.section === 'grammar').length;

    const stats = [
        { icon: Languages, value: totalWords, label: 'Mots appris', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { icon: Target, value: `${accuracy}%`, label: 'Précision', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        { icon: Flame, value: progress.streak || 0, label: 'Série', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        { icon: BookOpen, value: grammarDone, label: 'Grammaire', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-3"
        >
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
                {stats.map(({ icon: Icon, value, label, color, bg }, i) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                    >
                        <Card className="border-0 shadow-sm bg-white/80 dark:bg-card">
                            <CardContent className="p-3 flex flex-col items-center gap-1">
                                <div className={`p-1.5 rounded-lg ${bg}`}>
                                    <Icon className={`h-4 w-4 ${color}`} />
                                </div>
                                <div className={`text-lg font-bold ${color}`}>{value}</div>
                                <div className="text-[10px] text-slate-400 text-center leading-tight">{label}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* 7-day chart */}
            <Card className="border-0 shadow-sm bg-white/80 dark:bg-card">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mots traduits — 7 derniers jours</span>
                    </div>
                    <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={last7} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
                                formatter={(v) => [`${v} mot(s)`, '']}
                            />
                            <Area type="monotone" dataKey="mots" stroke="#6366f1" strokeWidth={2} fill="url(#gradIndigo)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </motion.div>
    );
}