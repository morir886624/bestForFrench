import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FlashcardQuiz from "@/components/gamification/FlashcardQuiz";

export default function WeakWordsPanel({ onScoreUpdate }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [open, setOpen] = useState(false);
    const [practiceMode, setPracticeMode] = useState(false);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    // Fetch wrong quiz answers from session history
    const { data: wrongAnswers = [] } = useQuery({
        queryKey: ['weak-words', currentUser?.email],
        queryFn: () => base44.entities.SessionHistory.filter(
            { user_email: currentUser.email, section: 'quiz', quiz_result: 'wrong' },
            '-created_date',
            100
        ),
        enabled: !!currentUser?.email,
    });

    // Count how many times each word was missed
    const wordErrorMap = wrongAnswers.reduce((acc, item) => {
        const key = item.word_original;
        if (!key) return acc;
        if (!acc[key]) {
            acc[key] = {
                original: item.word_original,
                translation: item.word_translation,
                pronunciation: item.word_pronunciation || '',
                definition: item.word_definition || '',
                count: 0,
            };
        }
        acc[key].count++;
        return acc;
    }, {});

    const weakWords = Object.values(wordErrorMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    if (weakWords.length === 0) return null;

    return (
        <div className="mt-4">
            <button
                onClick={() => { setOpen(o => !o); setPracticeMode(false); }}
                className="w-full flex items-center justify-between gap-2 text-slate-600 hover:text-red-600 transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="font-semibold text-sm">Mots à revoir</span>
                    <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">{weakWords.length}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-red-100 transition-colors">
                    {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </div>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 space-y-3">
                            {!practiceMode ? (
                                <>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {weakWords.map((w, i) => (
                                            <motion.div
                                                key={w.original}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                            >
                                                <Card className="border-0 shadow-sm bg-red-50/60 dark:bg-red-900/10">
                                                    <CardContent className="p-3 flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{w.original}</span>
                                                            <span
                                                                className="ml-2 text-sm text-amber-600"
                                                                dir="rtl"
                                                                style={{ fontFamily: 'Vazirmatn, sans-serif' }}
                                                            >
                                                                {w.translation}
                                                            </span>
                                                            {w.pronunciation && (
                                                                <span className="ml-2 text-xs text-slate-400">/{w.pronunciation}/</span>
                                                            )}
                                                        </div>
                                                        <Badge className="bg-red-100 text-red-600 border-0 shrink-0 text-xs">
                                                            {w.count}× raté
                                                        </Badge>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={() => setPracticeMode(true)}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white"
                                        size="sm"
                                    >
                                        <Zap className="h-4 w-4 mr-2" />
                                        S'entraîner sur ces mots
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <Button variant="ghost" size="sm" onClick={() => setPracticeMode(false)} className="text-slate-500">
                                        ← Retour à la liste
                                    </Button>
                                    <FlashcardQuiz words={weakWords} onScoreUpdate={onScoreUpdate || (() => {})} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}