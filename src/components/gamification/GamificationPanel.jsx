import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Star, Award, Target, Zap, BookOpen, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export const BADGES = [
    { id: 'first_translate', icon: '🌟', label: 'Premier Pas', desc: 'Première bonne réponse', threshold: 1, field: 'correct_answers' },
    { id: 'ten_correct', icon: '🎯', label: 'Tireur d\'élite', desc: '10 bonnes réponses', threshold: 10, field: 'correct_answers' },
    { id: 'fifty_correct', icon: '🏆', label: 'Champion', desc: '50 bonnes réponses', threshold: 50, field: 'correct_answers' },
    { id: 'streak_5', icon: '🔥', label: 'En feu !', desc: 'Série de 5', threshold: 5, field: 'best_streak' },
    { id: 'streak_10', icon: '⚡', label: 'Éclair', desc: 'Série de 10', threshold: 10, field: 'best_streak' },
    { id: 'points_100', icon: '💯', label: 'Centurion', desc: '100 points', threshold: 100, field: 'total_points' },
    { id: 'points_500', icon: '🚀', label: 'Expert', desc: '500 points', threshold: 500, field: 'total_points' },
    { id: 'points_1000', icon: '👑', label: 'Maître', desc: '1000 points', threshold: 1000, field: 'total_points' },
];

export function checkNewBadges(progress) {
    const earned = progress.badges || [];
    const newBadges = [];
    for (const badge of BADGES) {
        if (!earned.includes(badge.id) && (progress[badge.field] || 0) >= badge.threshold) {
            newBadges.push(badge.id);
        }
    }
    return newBadges;
}

export default function GamificationPanel({ progress }) {
    if (!progress) return null;

    const earnedBadgeIds = progress.badges || [];
    const accuracy = progress.total_answers > 0
        ? Math.round((progress.correct_answers / progress.total_answers) * 100)
        : 0;

    return (
        <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={<Star className="h-5 w-5 text-amber-500" />} label="Points" value={progress.total_points || 0} color="amber" />
                <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />} label="Série" value={progress.streak || 0} color="orange" />
                <StatCard icon={<Target className="h-5 w-5 text-indigo-500" />} label="Précision" value={`${accuracy}%`} color="indigo" />
            </div>

            {/* Badges */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Badges</p>
                <div className="grid grid-cols-4 gap-2">
                    {BADGES.map(badge => {
                        const earned = earnedBadgeIds.includes(badge.id);
                        return (
                            <motion.div
                                key={badge.id}
                                whileHover={{ scale: 1.05 }}
                                className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                                    earned ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border border-amber-200 shadow-sm' : 'bg-slate-100 opacity-40'
                                }`}
                                title={badge.desc}
                            >
                                <span className="text-2xl">{badge.icon}</span>
                                <span className={`text-xs mt-1 font-medium leading-tight ${earned ? 'text-amber-700' : 'text-slate-400'}`}>{badge.label}</span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    const colors = {
        amber: 'from-amber-50 to-yellow-50 border-amber-100',
        orange: 'from-orange-50 to-red-50 border-orange-100',
        indigo: 'from-indigo-50 to-purple-50 border-indigo-100',
    };
    return (
        <Card className={`border bg-gradient-to-br ${colors[color]} shadow-sm`}>
            <CardContent className="p-3 text-center">
                <div className="flex justify-center mb-1">{icon}</div>
                <p className="text-xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
            </CardContent>
        </Card>
    );
}