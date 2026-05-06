import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard({ currentUserEmail }) {
    const { data: allProgress = [] } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => base44.entities.UserProgress.list('-total_points', 10),
    });

    const medal = (i) => ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-slate-800">Classement</span>
            </div>
            {allProgress.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">Soyez le premier au classement !</p>
            )}
            {allProgress.map((p, i) => {
                const isMe = p.user_email === currentUserEmail;
                return (
                    <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className={`border-0 shadow-sm ${isMe ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200' : 'bg-white/80'}`}>
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl w-8 text-center">{medal(i)}</span>
                                    <div>
                                        <p className={`font-semibold text-sm ${isMe ? 'text-indigo-700' : 'text-slate-800'}`}>
                                            {p.display_name || p.user_email?.split('@')[0] || 'Anonyme'}
                                            {isMe && <span className="ml-1 text-xs text-indigo-500">(vous)</span>}
                                        </p>
                                        <p className="text-xs text-slate-500">{p.correct_answers || 0} bonnes réponses</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-amber-600">{p.total_points || 0}</p>
                                    <p className="text-xs text-slate-400">pts</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}