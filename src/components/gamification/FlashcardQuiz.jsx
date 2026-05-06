import React, { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, RotateCcw, ChevronRight, Star } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import SpeakButton from "@/components/SpeakButton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Shuffle array utility
function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function FlashcardQuiz({ words, onScoreUpdate }) {
    const [deck, setDeck] = useState(() => shuffle(words));
    const [index, setIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [mode, setMode] = useState('flashcard'); // 'flashcard' | 'mcq'
    const [mcqOptions, setMcqOptions] = useState([]);
    const [mcqAnswered, setMcqAnswered] = useState(null);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const { speak, speakingKey } = useSpeech();

    const current = deck[index];

    const buildMCQ = useCallback((word, allWords) => {
        const wrong = shuffle(allWords.filter(w => w.original !== word.original)).slice(0, 3);
        return shuffle([word, ...wrong]);
    }, []);

    // If only 1 word, force flashcard mode
    const effectiveMode = deck.length < 2 ? 'flashcard' : mode;

    const startMCQ = () => {
        setMode('mcq');
        setMcqOptions(buildMCQ(current, deck));
        setMcqAnswered(null);
    };

    const handleFlashcard = (correct) => {
        const pts = correct ? 10 : 0;
        if (correct) { setScore(s => s + pts); onScoreUpdate(pts); toast.success("+10 pts !", { duration: 1000 }); }
        goNext();
    };

    const handleMCQ = (option) => {
        if (mcqAnswered !== null) return;
        const correct = option.original === current.original;
        setMcqAnswered(option.original);
        const pts = correct ? 15 : 0;
        if (correct) { setScore(s => s + pts); onScoreUpdate(pts); toast.success("+15 pts !", { duration: 1000 }); }
        setTimeout(goNext, 1200);
    };

    const goNext = () => {
        if (index + 1 >= deck.length) { setDone(true); return; }
        setIndex(i => i + 1);
        setFlipped(false);
        setMcqAnswered(null);
        if (mode === 'mcq') {
            const nextWord = deck[index + 1];
            setMcqOptions(buildMCQ(nextWord, deck));
        }
    };

    const restart = () => {
        setDeck(shuffle(words));
        setIndex(0);
        setFlipped(false);
        setMcqAnswered(null);
        setDone(false);
        setScore(0);
        if (mode === 'mcq') setMcqOptions(buildMCQ(shuffle(words)[0], words));
    };



    if (done) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                <div className="text-5xl">🎉</div>
                <h3 className="text-xl font-bold text-slate-800">Quiz terminé !</h3>
                <p className="text-slate-600">Score cette session : <span className="font-bold text-indigo-600">{score} pts</span></p>
                <Button onClick={restart} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <RotateCcw className="h-4 w-4 mr-2" /> Recommencer
                </Button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2">
                <Button size="sm" variant={effectiveMode === 'flashcard' ? 'default' : 'outline'} onClick={() => { setMode('flashcard'); setFlipped(false); }} className={effectiveMode === 'flashcard' ? 'bg-indigo-600 text-white' : ''}>
                    Flashcards
                </Button>
                {deck.length >= 2 && (
                <Button size="sm" variant={effectiveMode === 'mcq' ? 'default' : 'outline'} onClick={startMCQ} className={effectiveMode === 'mcq' ? 'bg-indigo-600 text-white' : ''}>
                    QCM
                </Button>
                )}
                <Badge className="ml-auto bg-amber-100 text-amber-700 border-0">{index + 1}/{deck.length}</Badge>
                <Badge className="bg-green-100 text-green-700 border-0"><Star className="h-3 w-3 mr-1" />{score}</Badge>
            </div>

            <AnimatePresence mode="wait">
                {effectiveMode === 'flashcard' ? (
                    <motion.div key={`flash-${index}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                        <div
                            className="cursor-pointer"
                            onClick={() => setFlipped(f => !f)}
                            style={{ perspective: '1000px' }}
                        >
                            <motion.div
                                animate={{ rotateY: flipped ? 180 : 0 }}
                                transition={{ duration: 0.4 }}
                                style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: '160px' }}
                            >
                                {/* Front */}
                                <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50 absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-40">
                                        <p className="text-xs text-indigo-400 mb-2 uppercase tracking-wider">Français</p>
                                        <p className="text-2xl font-bold text-slate-800 text-center">{current.original}</p>
                                        <p className="text-xs text-slate-400 mt-3">Cliquez pour voir la traduction</p>
                                    </CardContent>
                                </Card>
                                {/* Back */}
                                <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-40">
                                        <p className="text-xs text-amber-500 mb-2 uppercase tracking-wider">Traduction</p>
                                        <p className="text-2xl font-bold text-slate-800 text-center" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>{current.translation}</p>
                                        {current.pronunciation && <p className="text-sm text-amber-600 mt-1">{current.pronunciation}</p>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <SpeakButton text={current.translation} lang="fa" speakFn={speak} activeKey={speakingKey} itemKey={`fc-back-${index}`} />
                                            <span className="text-xs text-amber-600">Écouter</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                        {flipped && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mt-4">
                                <Button className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 border-0" variant="outline" onClick={() => handleFlashcard(false)}>
                                    <X className="h-4 w-4 mr-1" /> À revoir
                                </Button>
                                <Button className="flex-1 bg-green-100 text-green-700 hover:bg-green-200 border-0" variant="outline" onClick={() => handleFlashcard(true)}>
                                    <Check className="h-4 w-4 mr-1" /> Je savais !
                                </Button>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key={`mcq-${index}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="space-y-3">
                        <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
                            <CardContent className="p-6 text-center">
                                <p className="text-xs text-indigo-400 mb-2 uppercase tracking-wider">Quelle est la traduction ?</p>
                                <p className="text-2xl font-bold text-slate-800">{current.original}</p>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-2 gap-2">
                            {mcqOptions.map(option => {
                                const isCorrect = option.original === current.original;
                                const isSelected = mcqAnswered === option.original;
                                let cls = "bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
                                if (mcqAnswered !== null) {
                                    if (isCorrect) cls = "bg-green-100 border-green-400 text-green-800";
                                    else if (isSelected) cls = "bg-red-100 border-red-400 text-red-800";
                                    else cls = "bg-white border-slate-200 text-slate-400 opacity-60";
                                }
                                return (
                                    <Button key={option.original} variant="outline" onClick={() => handleMCQ(option)}
                                        className={`h-auto py-3 px-3 text-center leading-snug transition-all ${cls}`}>
                                        <span dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>{option.translation}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}