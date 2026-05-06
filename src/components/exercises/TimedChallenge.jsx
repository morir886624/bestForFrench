import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Zap, Trophy, RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

const DURATION = 60; // seconds

const LEVEL_DESCRIPTIONS = {
    all: 'tous niveaux confondus, mélange A1 à C1',
    A1: 'A1 débutant — mots très simples du quotidien',
    A2: 'A2 élémentaire — expressions courantes et mots fréquents',
    B1: 'B1 intermédiaire — vocabulaire de conversation courante',
    B2: 'B2 avancé — expressions idiomatiques et vocabulaire riche',
    C1: 'C1 expert — vocabulaire soutenu, littéraire et technique',
};

export default function TimedChallenge({ level = 'all', onResult }) {
    const [phase, setPhase] = useState('idle'); // idle | loading | playing | done
    const [words, setWords] = useState([]);
    const [index, setIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [timeLeft, setTimeLeft] = useState(DURATION);
    const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
    const [options, setOptions] = useState([]);
    const timerRef = useRef(null);

    const loadWords = async () => {
        setPhase('loading');
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Génère exactement 30 paires de mots français-persan de niveau ${level === 'all' ? 'varié (A1 à C1)' : level} (${LEVEL_DESCRIPTIONS[level] || ''}).
Respecte strictement le niveau ${level}. Chaque paire : un mot français + sa traduction persane (script persan) + translittération.`,
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
        const normalized = (result.pairs || []).map((p, i) => ({
            id: `tc-${i}`,
            fr: p.fr,
            fa: p.fa,
            pronunciation: p.pronunciation || '',
        }));
        setWords(shuffle(normalized));
        setPhase('idle');
    };

    useEffect(() => {
        loadWords();
        return () => clearInterval(timerRef.current);
    }, [level]);

    // Build options for current word
    useEffect(() => {
        if (phase !== 'playing' || words.length === 0) return;
        const current = words[index % words.length];
        const others = shuffle(words.filter((_, i) => i !== index % words.length)).slice(0, 3);
        setOptions(shuffle([current, ...others]));
    }, [index, phase, words]);

    const startGame = () => {
        setScore(0);
        setCorrect(0);
        setWrong(0);
        setIndex(0);
        setTimeLeft(DURATION);
        setFeedback(null);
        setPhase('playing');
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    setPhase('done');
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    };

    const handleAnswer = (opt) => {
        if (feedback) return;
        const current = words[index % words.length];
        const isCorrect = opt.id === current.id;
        setFeedback(isCorrect ? 'correct' : 'wrong');
        const pts = isCorrect ? 10 : 0;
        if (isCorrect) {
            setScore(s => s + pts);
            setCorrect(c => c + 1);
        } else {
            setWrong(w => w + 1);
        }
        onResult && onResult(isCorrect, pts);
        setTimeout(() => {
            setFeedback(null);
            setIndex(i => i + 1);
        }, 400);
    };

    const timerColor = timeLeft > 20 ? 'text-emerald-600' : timeLeft > 10 ? 'text-amber-500' : 'text-red-500';
    const timerBg = timeLeft > 20 ? 'bg-emerald-50 border-emerald-200' : timeLeft > 10 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

    if (phase === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm">Préparation du défi niveau <strong>{level}</strong>...</p>
            </div>
        );
    }

    if (phase === 'idle') {
        return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 text-center py-6">
                <div className="text-6xl">⚡</div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Défi Chronométré</h3>
                    <p className="text-sm text-slate-500 mt-1">Réponds à un maximum de questions en <strong>60 secondes</strong> !</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                        { icon: '⏱️', label: '60 secondes', sub: 'de temps' },
                        { icon: '⚡', label: '+10 pts', sub: 'par bonne réponse' },
                        { icon: '🏆', label: 'Niveau', sub: level === 'all' ? 'Tous niveaux' : level },
                    ].map((item, i) => (
                        <div key={i} className="bg-slate-50 dark:bg-secondary rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                            <div className="text-xl mb-1">{item.icon}</div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
                            <p className="text-xs text-slate-400">{item.sub}</p>
                        </div>
                    ))}
                </div>
                <Button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-12 text-base font-semibold">
                    <Zap className="h-5 w-5 mr-2" /> Commencer le défi !
                </Button>
            </motion.div>
        );
    }

    if (phase === 'done') {
        const accuracy = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;
        const total = correct + wrong;
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center py-4">
                <div className="text-6xl">{score >= 100 ? '🏆' : score >= 50 ? '🥈' : '💪'}</div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Temps écoulé !</h3>
                    <p className="text-sm text-slate-500 mt-1">Voici vos résultats</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800">
                        <div className="text-2xl font-bold text-indigo-700">{score}</div>
                        <div className="text-xs text-slate-500">Points</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
                        <div className="text-2xl font-bold text-emerald-600">{correct}</div>
                        <div className="text-xs text-slate-500">Corrects</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
                        <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
                        <div className="text-xs text-slate-500">Précision</div>
                    </div>
                </div>
                {score >= 100 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">🌟 Excellent ! +{score} pts ajoutés à votre score !</p>
                    </div>
                )}
                <div className="flex gap-2">
                    <Button onClick={startGame} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <RotateCcw className="h-4 w-4 mr-2" /> Rejouer
                    </Button>
                    <Button onClick={loadWords} variant="outline" className="flex-1 border-slate-200 text-slate-600">
                        Nouveaux mots
                    </Button>
                </div>
            </motion.div>
        );
    }

    // Playing
    const current = words[index % words.length];
    const progress = ((DURATION - timeLeft) / DURATION) * 100;

    return (
        <div className="space-y-4">
            {/* Timer bar + stats */}
            <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-lg min-w-[72px] justify-center ${timerBg} ${timerColor}`}>
                    <Timer className="h-4 w-4" />
                    {timeLeft}s
                </div>
                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full transition-all ${timeLeft > 20 ? 'bg-emerald-500' : timeLeft > 10 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${100 - progress}%` }}
                        transition={{ duration: 1, ease: 'linear' }}
                    />
                </div>
                <div className="flex items-center gap-1 text-indigo-700 font-bold text-sm">
                    <Zap className="h-4 w-4 text-indigo-500" />{score}
                </div>
            </div>

            {/* Score strip */}
            <div className="flex gap-2 text-xs">
                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-semibold">✓ {correct}</span>
                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg font-semibold">✗ {wrong}</span>
                <span className="ml-auto text-slate-400">Question {index + 1}</span>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                >
                    <Card className={`border-2 shadow-lg transition-colors ${
                        feedback === 'correct' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' :
                        feedback === 'wrong' ? 'border-red-400 bg-red-50 dark:bg-red-900/20' :
                        'border-slate-100 bg-white/90 dark:bg-card'
                    }`}>
                        <CardContent className="p-5 space-y-4">
                            <div className="text-center">
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs mb-2">Persan → Français</Badge>
                                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 py-2" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                    {current.fa}
                                </div>
                                {current.pronunciation && (
                                    <p className="text-xs text-amber-600">/{current.pronunciation}/</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {options.map((opt) => {
                                    let cls = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-secondary hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 dark:text-slate-200 active:scale-95';
                                    if (feedback) {
                                        if (opt.id === current.id) cls = 'border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
                                        else if (opt.id !== current.id && feedback === 'wrong') cls = 'border-slate-200 bg-white text-slate-400 opacity-50';
                                        else cls = 'border-slate-200 bg-white text-slate-400 opacity-50';
                                    }
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={!!feedback}
                                            className={`rounded-xl border-2 p-3 text-sm font-medium transition-all text-center ${cls}`}
                                        >
                                            {opt.fr}
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}