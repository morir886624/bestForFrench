import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Loader2, Lightbulb, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BUILT_IN_QUIZ = [
  { question: "Comment dit-on 'chat' en persan ?", correct: "گربه", correct_pronunciation: "gorbe", options: ["گربه", "سگ", "پرنده", "ماهی"] },
  { question: "Comment dit-on 'merci' en persan ?", correct: "ممنون", correct_pronunciation: "mamnoon", options: ["ممنون", "سلام", "خداحافظ", "بله"] },
  { question: "Comment dit-on 'maison' en persan ?", correct: "خانه", correct_pronunciation: "khaneh", options: ["خانه", "ماشین", "کتاب", "آب"] },
  { question: "Comment dit-on 'eau' en persan ?", correct: "آب", correct_pronunciation: "ab", options: ["آب", "شیر", "نان", "چای"] },
  { question: "Comment dit-on 'pain' en persan ?", correct: "نان", correct_pronunciation: "nan", options: ["نان", "برنج", "گوشت", "پنیر"] },
  { question: "Comment dit-on 'ami' en persan ?", correct: "دوست", correct_pronunciation: "doost", options: ["دوست", "دشمن", "پدر", "مادر"] },
  { question: "Comment dit-on 'soleil' en persan ?", correct: "آفتاب", correct_pronunciation: "aaftab", options: ["آفتاب", "ماه", "ستاره", "ابر"] },
  { question: "Comment dit-on 'livre' en persan ?", correct: "کتاب", correct_pronunciation: "ketab", options: ["کتاب", "قلم", "دفت", "چوب"] },
  { question: "Comment dit-on 'famille' en persan ?", correct: "خانواده", correct_pronunciation: "khaanevadeh", options: ["خانواده", "دوست", "همسایه", "معلم"] },
  { question: "Comment dit-on 'école' en persan ?", correct: "مدرسه", correct_pronunciation: "madreseh", options: ["مدرسه", "بیمارستان", "فروشگاه", "پارک"] },
  { question: "Comment dit-on 'bonjour' en persan ?", correct: "سلام", correct_pronunciation: "salaam", options: ["سلام", "خداحافظ", "ممنون", "ببخشید"] },
  { question: "Comment dit-on 'voyage' en persan ?", correct: "سفر", correct_pronunciation: "safar", options: ["سفر", "کار", "خواب", "غذا"] },
  { question: "Comment dit-on 'travail' en persan ?", correct: "کار", correct_pronunciation: "kaar", options: ["کار", "بازی", "استراحت", "درس"] },
  { question: "Comment dit-on 'musique' en persan ?", correct: "موسیقی", correct_pronunciation: "moosighi", options: ["موسیقی", "نقاشی", "رقص", "فیلم"] },
  { question: "Comment dit-on 'montagne' en persan ?", correct: "کوه", correct_pronunciation: "kooh", options: ["کوه", "دریا", "رودخانه", "جنگل"] },
];

const QUIZ_TOPICS = [
    'les animaux', 'la nourriture', 'les couleurs', 'les chiffres', 'la famille',
    'le corps humain', 'les vêtements', 'les transports', 'les métiers', 'les émotions',
    'la nature', 'les sports', 'la maison', 'le temps et les saisons', 'les pays et nationalités',
    'les fruits et légumes', 'les meubles', 'les actions quotidiennes', 'la technologie', 'les voyages',
];

const QUIZ_TYPES = [
    { id: 'fr-to-fa', label: '🇫🇷 → 🇮🇷', desc: 'Français → Persan' },
    { id: 'fa-to-fr', label: '🇮🇷 → 🇫🇷', desc: 'Persan → Français' },
    { id: 'mcq', label: '📝 QCM', desc: 'Choix multiple' },
    { id: 'fill', label: '✍️ Phrase', desc: 'Compléter' },
];

export default function QuizCard({ onScoreUpdate, level = 'all' }) {
    const [quizType, setQuizType] = useState('fr-to-fa');
    const [question, setQuestion] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [streak, setStreak] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const generateQuestion = async () => {
        setIsLoading(true);
        setShowResult(false);
        setUserAnswer('');
        setShowHint(false);
        setQuestion(null);

        const topic = QUIZ_TOPICS[Math.floor(Math.random() * QUIZ_TOPICS.length)];
        const seed = Math.floor(Math.random() * 10000);
        const levelHint = level !== 'all' ? ` Adapte le vocabulaire au niveau CECRL ${level}.` : '';

        let prompt = '';
        let schema = {};

        if (quizType === 'fr-to-fa') {
            prompt = `Génère une question de quiz français→persan sur le thème "${topic}" (seed:${seed}).${levelHint}
Donne un mot ou expression français et sa traduction persane + translittération. Varie les mots à chaque fois.`;
            schema = {
                type: 'object',
                properties: {
                    question: { type: 'string', description: 'Le mot/expression en français' },
                    answer: { type: 'string', description: 'La traduction en persan (script persan)' },
                    pronunciation: { type: 'string', description: 'Translittération phonétique' },
                    hint: { type: 'string', description: 'Indice ou contexte utile' },
                },
                required: ['question', 'answer', 'pronunciation', 'hint'],
            };
        } else if (quizType === 'fa-to-fr') {
            prompt = `Génère une question de quiz persan→français sur le thème "${topic}" (seed:${seed}).${levelHint}
Donne un mot/expression en persan et sa traduction française. Varie les mots à chaque fois.`;
            schema = {
                type: 'object',
                properties: {
                    question_fa: { type: 'string', description: 'Le mot en persan' },
                    question_pronunciation: { type: 'string', description: 'Translittération du mot persan' },
                    answer: { type: 'string', description: 'La traduction en français' },
                    hint: { type: 'string', description: 'Indice ou définition' },
                },
                required: ['question_fa', 'question_pronunciation', 'answer', 'hint'],
            };
        } else if (quizType === 'mcq') {
            prompt = `Génère un QCM de traduction français→persan sur le thème "${topic}" (seed:${seed}).${levelHint}
Un mot français avec 4 propositions de traduction persane, une seule est correcte. Varie les mots à chaque fois.`;
            schema = {
                type: 'object',
                properties: {
                    question: { type: 'string', description: 'Le mot en français' },
                    correct: { type: 'string', description: 'La bonne traduction persane' },
                    correct_pronunciation: { type: 'string', description: 'Translittération de la bonne réponse' },
                    options: { type: 'array', items: { type: 'string' }, description: '4 options de réponse (inclut la bonne)' },
                },
                required: ['question', 'correct', 'correct_pronunciation', 'options'],
            };
        } else if (quizType === 'fill') {
            prompt = `Génère un exercice de complétion de phrase en français sur le thème "${topic}" (seed:${seed}).${levelHint}
Une phrase avec un mot manqué (persan affiché), à compléter en français. Varie les phrases à chaque fois.`;
            schema = {
                type: 'object',
                properties: {
                    sentence_with_blank: { type: 'string', description: 'Phrase française avec ___ à la place du mot manquant' },
                    word_fa: { type: 'string', description: 'Le mot en persan à traduire' },
                    word_pronunciation: { type: 'string', description: 'Translittération' },
                    answer: { type: 'string', description: 'Le mot français manquant' },
                    hint: { type: 'string', description: 'Indice' },
                },
                required: ['sentence_with_blank', 'word_fa', 'word_pronunciation', 'answer', 'hint'],
            };
        }

        const apiKey = localStorage.getItem('app_api_key');
        if (apiKey) {
            try {
                const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
                if (result) {
                    setQuestion({ ...result, topic, type: quizType });
                    setIsLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Quiz generation error (falling back):", err);
            }
        }

        // Fallback: built-in quiz questions
        const randomQ = BUILT_IN_QUIZ[Math.floor(Math.random() * BUILT_IN_QUIZ.length)];
        setQuestion({ ...randomQ, topic: 'Vocabulaire', type: 'mcq' });
        if (!apiKey) {
            toast.info("Mode gratuit : questions prédéfinies. Ajoutez une clé API pour des questions IA illimitées.");
        }
        setIsLoading(false);
    };

    const checkAnswer = (chosen) => {
        const ans = (chosen ?? userAnswer).trim().toLowerCase();
        let correct = false;

        if (question.type === 'mcq') {
            correct = chosen === question.correct;
        } else if (question.type === 'fr-to-fa') {
            correct = ans === (question.answer || '').toLowerCase() ||
                ans === (question.pronunciation || '').toLowerCase();
        } else {
            correct = ans === (question.answer || '').toLowerCase();
        }

        setIsCorrect(correct);
        setShowResult(true);
        if (correct) {
            setStreak(s => s + 1);
            onScoreUpdate?.(1);
        } else {
            setStreak(0);
        }

        // Save to history
        if (currentUser && question) {
            const wordOrig = question.question || question.question_fa || question.sentence_with_blank || '';
            const wordTrans = question.answer || question.correct || '';
            base44.entities.SessionHistory.create({
                user_email: currentUser.email,
                section: 'quiz',
                word_original: wordOrig,
                word_translation: wordTrans,
                word_pronunciation: question.pronunciation || question.correct_pronunciation || question.question_pronunciation || '',
                word_definition: question.hint || '',
                quiz_result: correct ? 'correct' : 'wrong',
                topic: question.topic || '',
                source_language: 'français',
                target_language: 'persan',
            }).catch(() => {});
        }
    };

    const speak = (text, lang) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'fa' ? 'fa-IR' : 'fr-FR';
        speechSynthesis.speak(u);
    };

    return (
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-card backdrop-blur-lg overflow-hidden">
            <CardContent className="p-5 space-y-4">
                {/* Type selector */}
                <div className="flex flex-wrap gap-2">
                    {QUIZ_TYPES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setQuizType(t.id); setQuestion(null); setShowResult(false); }}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                                quizType === t.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                                    : 'bg-white dark:bg-secondary text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Streak */}
                {streak > 0 && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Badge className="bg-gradient-to-r from-orange-400 to-amber-400 text-white border-0">
                            🔥 Série de {streak}
                        </Badge>
                    </motion.div>
                )}

                {/* Generate button or question */}
                {!question && !isLoading && (
                    <div className="text-center py-6">
                        <p className="text-slate-400 text-sm mb-4">Générez une question aléatoire sur un nouveau thème !</p>
                        <Button onClick={generateQuestion} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Nouvelle question →
                        </Button>
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        <span className="text-sm">Génération d'une question...</span>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {question && !isLoading && (
                        <motion.div key={question.question || question.sentence_with_blank} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                            {/* Topic badge */}
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-slate-400 capitalize">{question.topic}</Badge>
                            </div>

                            {/* Question display */}
                            {question.type === 'fr-to-fa' && (
                                <div className="text-center space-y-1">
                                    <p className="text-xs text-slate-400">Comment dit-on en persan ?</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{question.question}</p>
                                        <button onClick={() => speak(question.question, 'fr')} className="p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-500">
                                            <Volume2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {question.type === 'fa-to-fr' && (
                                <div className="text-center space-y-1">
                                    <p className="text-xs text-slate-400">Que signifie ce mot en français ?</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                            {question.question_fa}
                                        </p>
                                        <button onClick={() => speak(question.question_fa, 'fa')} className="p-1 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500">
                                            <Volume2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-amber-600">/{question.question_pronunciation}/</p>
                                </div>
                            )}

                            {question.type === 'mcq' && (
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 mb-1">Quelle est la traduction persane ?</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{question.question}</p>
                                    </div>
                                    )}

                                    {question.type === 'fill' && (
                                    <div className="text-center space-y-2">
                                    <p className="text-xs text-slate-400">Complétez la phrase :</p>
                                    <p className="text-base font-medium text-slate-700 dark:text-slate-200">{question.sentence_with_blank}</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xl font-bold text-amber-700" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                            {question.word_fa}
                                        </span>
                                        <span className="text-xs text-amber-500">/{question.word_pronunciation}/</span>
                                    </div>
                                </div>
                            )}

                            {/* Answer section */}
                            {!showResult ? (
                                <div className="space-y-3">
                                    {question.type === 'mcq' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {question.options.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => checkAnswer(opt)}
                                                    className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-secondary hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 p-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all"
                                                    dir="rtl"
                                                    style={{ fontFamily: 'Vazirmatn, sans-serif' }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input
                                                value={userAnswer}
                                                onChange={e => setUserAnswer(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && userAnswer.trim() && checkAnswer()}
                                                placeholder={question.type === 'fr-to-fa' ? 'Écrivez en persan ou phonétique...' : 'Votre réponse en français...'}
                                                className="h-12 text-center text-lg rounded-xl"
                                                dir={question.type === 'fr-to-fa' ? 'rtl' : 'ltr'}
                                                style={question.type === 'fr-to-fa' ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                                                autoFocus
                                            />
                                            <div className="flex gap-2 justify-center">
                                                <Button onClick={() => checkAnswer()} disabled={!userAnswer.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                    Vérifier <ArrowRight className="ml-1 h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" onClick={() => setShowHint(true)} disabled={showHint}>
                                                    <Lightbulb className="h-4 w-4 mr-1" /> Indice
                                                </Button>
                                            </div>
                                            {showHint && (
                                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-amber-600 text-sm">
                                                    💡 {question.hint}
                                                </motion.p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 text-center">
                                    <div className={cn(
                                        'inline-flex items-center gap-3 px-5 py-3 rounded-2xl',
                                        isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
                                    )}>
                                        {isCorrect
                                            ? <CheckCircle2 className="h-7 w-7 text-green-600" />
                                            : <XCircle className="h-7 w-7 text-red-500" />
                                        }
                                        <div className="text-left">
                                            <p className={cn('font-semibold', isCorrect ? 'text-green-700' : 'text-red-700')}>
                                                {isCorrect ? 'Excellent !' : 'Pas tout à fait…'}
                                            </p>
                                            {!isCorrect && (
                                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                                    Réponse : <strong
                                                        dir={question.type === 'fr-to-fa' ? 'rtl' : 'ltr'}
                                                        style={question.type === 'fr-to-fa' ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                                                    >{question.answer || question.correct}</strong>
                                                    {(question.pronunciation || question.correct_pronunciation) && (
                                                        <span className="text-xs text-slate-400 ml-2">
                                                            /{ question.pronunciation || question.correct_pronunciation}/
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button onClick={generateQuestion} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        <RotateCcw className="mr-2 h-4 w-4" /> Question suivante
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}