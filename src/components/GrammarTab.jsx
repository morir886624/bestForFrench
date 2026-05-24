import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { translateText as freeTranslate } from '@/api/llmService';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ChevronRight, Volume2, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SectionHistory from "@/components/history/SectionHistory";
import ExportToSheetsButton from "@/components/ExportToSheetsButton";
import { getCachedContent, setCachedContent } from "@/utils/aiContentCache";
import { appendToSheet, isSheetsConfigured } from "@/lib/googleSheets";

const LEVELS = [
    { id: 'A1', label: 'A1 – Débutant', color: 'bg-green-100 text-green-700 border-green-200', bg: 'from-green-50 to-emerald-50', border: 'border-green-100' },
    { id: 'A2', label: 'A2 – Élémentaire', color: 'bg-teal-100 text-teal-700 border-teal-200', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-100' },
    { id: 'B1', label: 'B1 – Intermédiaire', color: 'bg-blue-100 text-blue-700 border-blue-200', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100' },
    { id: 'B2', label: 'B2 – Avancé', color: 'bg-purple-100 text-purple-700 border-purple-200', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100' },
    { id: 'C1', label: 'C1 – Expert', color: 'bg-rose-100 text-rose-700 border-rose-200', bg: 'from-rose-50 to-pink-50', border: 'border-rose-100' },
];

const BUILT_IN_GRAMMAR = {
  A1: [
    { title: "Les articles définis (le, la, l', les)", explanation: "En français, les articles définis s'accordent en genre et en nombre avec le nom.", rule: "Masculin singulier = le, Féminin singulier = la, Devant voyelle = l', Pluriel = les", tip: "Attention : 'le' et 'la' deviennent 'l'' devant une voyelle ou un h muet." },
    { title: "Le verbe être au présent", explanation: "Le verbe être (to be) est essentiel en français. Il s'utilise pour décrire l'état ou l'identité.", rule: "je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont", tip: "Ne confondez pas 'est' (verbe être) avec 'et' (conjonction de coordination)." },
    { title: "Le verbe avoir au présent", explanation: "Le verbe avoir (to have) est utilisé pour exprimer la possession et dans de nombreuses expressions.", rule: "j'ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont", tip: "Attention à la prononciation : 'ont' se prononce comme 'on' (nasal)." },
    { title: "Les pronoms sujets", explanation: "Les pronoms sujets remplacent le nom sujet dans la phrase.", rule: "je (j'), tu, il/elle/on, nous, vous, ils/elles", tip: "'On' est très utilisé à l'oral pour remplacer 'nous'." },
    { title: "Masculin et féminin des noms", explanation: "Chaque nom français a un genre : masculin ou féminin. Il faut l'apprendre par cœur.", rule: "En général : -e final = féminin (une maison), consonne finale = masculin (un livre)", tip: "Il y a beaucoup d'exceptions ! Par exemple : 'un problème' est masculin malgré le -e." },
  ],
  A2: [
    { title: "Le passé composé", explanation: "Le passé composé exprime une action terminée dans le passé.", rule: "Sujet + avoir/être (conjugué) + participe passé", tip: "Certains verbes utilisent 'être' comme auxiliaire (aller, venir, monter, descendre...)." },
    { title: "Les adjectifs possessifs", explanation: "Les adjectifs possessifs indiquent à qui appartient quelque chose.", rule: "mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos, leur/leurs", tip: "Devant un nom féminin commençant par une voyelle, on utilise 'mon', 'ton', 'son' au lieu de 'ma', 'ta', 'sa'." },
    { title: "Le futur proche", explanation: "Le futur proche exprime une action qui va se produire bientôt.", rule: "Sujet + aller (conjugué) + verbe à l'infinitif", tip: "Exemple : 'Je vais manger' = I am going to eat." },
    { title: "Les prépositions de lieu", explanation: "Les prépositions de lieu indiquent où se trouve quelque chose.", rule: "dans, en, à, sur, sous, devant, derrière, entre, chez", tip: "'À' devient 'au' devant un nom masculin (au restaurant) et 'aux' devant un pluriel." },
    { title: "L'imparfait", explanation: "L'imparfait décrit des habitudes ou des descriptions dans le passé.", rule: "Radical du nous au présent + -ais, -ais, -ait, -ions, -iez, -aient", tip: "L'imparfait est souvent utilisé avec le passé composé : l'imparfait pour le décor, le passé composé pour l'événement." },
  ],
  B1: [
    { title: "Le subjonctif présent", explanation: "Le subjonctif exprime l'incertitude, le doute, le souhait ou l'émotion.", rule: "Après : il faut que, je veux que, bien que, pour que, avant que + subjonctif", tip: "Le subjonctif se forme à partir du radical de 'ils' au présent + -e, -es, -e, -ions, -iez, -ent." },
    { title: "Les pronoms relatifs", explanation: "Les pronoms relatifs relient deux propositions et remplacent un nom.", rule: "qui (sujet), que (objet), dont (possession), où (lieu/temps)", tip: "'Dont' remplace 'de + nom' : 'Le livre dont je parle' = 'Le livre de lequel je parle'." },
    { title: "Le conditionnel présent", explanation: "Le conditionnel exprime un souhait, une hypothèse ou la politesse.", rule: "Radical du futur + -ais, -ais, -ait, -ions, -iez, -aient", tip: "Pour la politesse : 'Je voudrais' est plus poli que 'Je veux'." },
    { title: "Les pronoms COD et COI", explanation: "Les pronoms compléments remplacent les objets directs et indirects.", rule: "COD : me, te, le/la, nous, vous, les | COI : me, te, lui, nous, vous, leur", tip: "L'ordre des pronoms : COI + COD : 'Je te le donne' (pas 'Je le te donne')." },
    { title: "Le plus-que-parfait", explanation: "Le plus-que-parfait exprime une action antérieure à une autre action passée.", rule: "Sujet + avoir/être à l'imparfait + participe passé", tip: "Signal : le plus-que-parfait est souvent accompagné d'un autre temps du passé dans le récit." },
  ],
  B2: [
    { title: "Le subjonctif passé", explanation: "Le subjonctif passé exprime une action achevée avant l'action principale.", rule: "avoir/être au subjonctif présent + participe passé", tip: "Utilisé quand le verbe au subjonctif doit être antérieur à un autre : 'Je suis content que tu aies réussi.'" },
    { title: "La voix passive", explanation: "La voix passive met l'objet en position de sujet.", rule: "Sujet + être conjugué + participe passé + par + agent", tip: "Seuls les verbes transitifs directs peuvent être mis à la voix passive." },
    { title: "Les propositions concessives", explanation: "Les concessives opposent deux idées en admettant l'une.", rule: "bien que + subjonctif | même si + indicatif | cependant, toutefois, néanmoins", tip: "'Bien que' exige le subjonctif, 'même si' exige l'indicatif. C'est une erreur fréquente." },
    { title: "Le discours indirect", explanation: "Le discours indirect rapporte les paroles de quelqu'un sans les citer directement.", rule: "Concordance des temps : présent → imparfait, passé composé → plus-que-parfait", tip: "Les pronoms et les indicateurs de temps changent aussi : 'demain' → 'le lendemain'." },
    { title: "Le gérondif", explanation: "Le gérondif exprime la simultanéité, la cause ou la condition.", rule: "en + participe présent : en marchant, en lisant, en travaillant", tip: "Le sujet du gérondif doit être le même que celui du verbe principal." },
  ],
  C1: [
    { title: "Le subjonctif imparfait", explanation: "Le subjonctif imparfait s'utilise dans la littérature et le langage soutenu après un verbe au passé.", rule: "Radical du passé simple + -asse, -asses, -ât, -assions, -assiez, -assent", tip: "Ce temps est surtout littéraire. À l'oral, on utilise le subjonctif présent même après un passé." },
    { title: "Les particules explétives", explanation: "Le 'ne' explétif apparaît sans valeur négative dans certaines subordonnées.", rule: "Après : craindre que, de peur que, avant que, sans que + ne explétif", tip: "Le 'ne' explétif est obligatoire à l'écrit soutenu, facultatif à l'oral." },
    { title: "L'inversion complexe", explanation: "L'inversion du sujet peut être simple, complexe ou avec un pronom sujet résumé.", rule: "Question : Verbe + pronom sujet | L'inversion complexe : Verbe + NOM + pronom", tip: "Après un nom propre, on ajoute un pronom sujet : 'Marie chante-elle ?' (pas 'Chante Marie ?')" },
    { title: "Le passé simple", explanation: "Le passé simple est le temps du récit littéraire. Il n'est pas utilisé à l'oral.", rule: "-ai, -as, -a, -âmes, -âtes, -èrent (1er groupe) | -is, -is, -it, -îmes, -îtes, -irent (2e)", tip: "À l'oral, le passé composé remplace toujours le passé simple." },
    { title: "La nominalisation", explanation: "La nominalisation transforme un verbe ou un adjectif en nom pour rendre le style plus dense.", rule: "Verbe → nom : créer → création | Adjectif → nom : grand → grandeur", tip: "La nominalisation est caractéristique du style journalistique et académique." },
  ],
};

export default function GrammarTab({ appLang }) {
    const [selectedLevel, setSelectedLevel] = useState('A1');
    const [lessons, setLessons] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [lessonDone, setLessonDone] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [savedToSheet, setSavedToSheet] = useState(false);
    const [isSavingSheet, setIsSavingSheet] = useState(false);

    const level = LEVELS.find(l => l.id === selectedLevel);
    const isFa = appLang === 'fa';
    const fontStyle = isFa ? { fontFamily: 'Vazirmatn, sans-serif' } : {};

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const fetchLessons = async (forceRefresh = false) => {
        setIsLoading(true);
        setLessons([]);
        setCurrentIndex(0);
        setLessonDone(false);

        // Check cache first
        if (!forceRefresh) {
            const cachedLessons = getCachedContent('grammar', selectedLevel);
            if (cachedLessons && cachedLessons.length > 0) {
                console.log('Using cached grammar lessons for level:', selectedLevel);
                setLessons(cachedLessons);
                setIsLoading(false);
                return;
            }
        }

        // Try OpenAI first if API key exists
        const apiKey = localStorage.getItem('app_api_key');
        if (apiKey) {
            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Genere 5 fiches de grammaire francaise de niveau ${selectedLevel} pour un apprenant persanophone.
Chaque fiche doit contenir :
1. Le point de grammaire en francais (ex: "Le present de l'indicatif")
2. La traduction persane du titre
3. Une explication claire en francais
4. La meme explication traduite en persan (فارسی)
5. La regle principale en francais (1-2 phrases)
6. La meme regle traduite en persan
7. 2 exemples en francais avec leur traduction persane
8. Un point d'attention / erreur frequente en francais
9. Ce meme point d'attention traduit en persan

Niveau ${selectedLevel}: ${level?.label}`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            lessons: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        title_fa: { type: "string" },
                                        explanation: { type: "string" },
                                        explanation_fa: { type: "string" },
                                        rule: { type: "string" },
                                        rule_fa: { type: "string" },
                                        examples: { type: "array", items: { type: "object", properties: { fr: { type: "string" }, fa: { type: "string" } } } },
                                        tip: { type: "string" },
                                        tip_fa: { type: "string" }
                                    },
                                    required: ["title", "title_fa", "explanation", "explanation_fa", "rule", "rule_fa", "examples", "tip", "tip_fa"]
                                }
                            }
                        },
                        required: ["lessons"]
                    }
                });

                const generatedLessons = result?.lessons || [];
                if (generatedLessons.length > 0) {
                    setLessons(generatedLessons);
                    setCachedContent('grammar', selectedLevel, '', generatedLessons);
                    setIsLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Grammar generation error (falling back to built-in):", err);
            }
        }

        // Fallback: built-in grammar lessons + free translation for Persian
        try {
            const builtIn = BUILT_IN_GRAMMAR[selectedLevel] || BUILT_IN_GRAMMAR.A1;
            const translatedLessons = await Promise.all(
                builtIn.map(async (l) => {
                    const [titleFa, ruleFa, tipFa] = await Promise.all([
                        freeTranslate(l.title, 'Français', 'Persan').catch(() => ''),
                        freeTranslate(l.rule, 'Français', 'Persan').catch(() => ''),
                        freeTranslate(l.tip, 'Français', 'Persan').catch(() => ''),
                    ]);
                    return {
                        title: l.title,
                        title_fa: titleFa,
                        explanation: l.explanation,
                        explanation_fa: '',
                        rule: l.rule,
                        rule_fa: ruleFa,
                        examples: [],
                        tip: l.tip,
                        tip_fa: tipFa,
                    };
                })
            );
            setLessons(translatedLessons);
            if (!apiKey) {
                toast.info("Mode gratuit : fiches prédéfinies. Ajoutez une clé API pour du contenu IA illimité.");
            }
        } catch (err) {
            console.error("Built-in grammar error:", err);
            toast.error("Erreur lors du chargement des fiches.");
        }

        setIsLoading(false);
    };

    const handleSaveLessonToSheet = async (l) => {
        setIsSavingSheet(true);
        const rows = (l.examples || []).map((ex, i) => [
            selectedLevel, l.title, l.title_fa, l.rule,
            ex.fr || '', ex.fa || '',
            i === 0 ? l.tip : ''
        ]);
        if (rows.length === 0) rows.push([selectedLevel, l.title, l.title_fa, l.rule, '', '', l.tip]);
        await appendToSheet('Grammaire', rows);
        setSavedToSheet(true);
        setIsSavingSheet(false);
        toast.success("Fiche enregistrée dans Google Sheets !");
        setTimeout(() => setSavedToSheet(false), 3000);
    };

    const speak = (text) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        speechSynthesis.speak(u);
    };

    const handleNext = () => {
        const lesson = lessons[currentIndex];
        if (lesson && currentUser) {
            base44.entities.SessionHistory.create({
                user_email: currentUser.email,
                section: 'grammar',
                word_original: lesson.title,
                word_translation: lesson.title_fa,
                word_pronunciation: '',
                word_definition: lesson.rule,
                topic: `Niveau ${selectedLevel}`,
                source_language: 'français',
                target_language: 'persan',
            }).catch(() => {});
        }
        if (currentIndex + 1 >= lessons.length) {
            setLessonDone(true);
        } else {
            setCurrentIndex(i => i + 1);
        }
    };

    const lesson = lessons[currentIndex];

    return (
        <div className="space-y-4">
            {/* Level selector */}
            <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                    <button
                        key={l.id}
                        onClick={() => { setSelectedLevel(l.id); setLessons([]); setCurrentIndex(0); setLessonDone(false); }}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                            selectedLevel === l.id
                                ? l.color + ' shadow-md scale-105'
                                : 'bg-white/70 text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {l.id}
                    </button>
                ))}
            </div>

            <Card className={`border bg-gradient-to-br ${level.bg} ${level.border} shadow-lg`}>
                <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Badge className={`${level.color} border text-xs font-semibold`}>{level.label}</Badge>
                            <p className="text-xs text-slate-500 mt-1">Grammaire française</p>
                        </div>
                        <Button
                            onClick={fetchLessons}
                            disabled={isLoading}
                            size="sm"
                            className="bg-white/80 text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-sm"
                            variant="outline"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                            {lessons.length > 0 ? '5 nouvelles fiches' : 'Générer 5 fiches'}
                        </Button>
                    </div>

                    {/* Progress */}
                    {lessons.length > 0 && !lessonDone && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Fiche {currentIndex + 1} sur {lessons.length}</span>
                                <span>{Math.round(((currentIndex + 1) / lessons.length) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-indigo-500 rounded-full"
                                    animate={{ width: `${((currentIndex + 1) / lessons.length) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center justify-center py-8 gap-2 text-slate-500">
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                <span>Génération des fiches de grammaire...</span>
                            </motion.div>
                        )}

                        {lessonDone && (
                            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4 py-4">
                                <div className="text-5xl">🎓</div>
                                <h3 className="text-xl font-bold text-slate-800">Leçon terminée !</h3>
                                <p className="text-slate-500 text-sm">Vous avez vu les {lessons.length} fiches de grammaire niveau {selectedLevel}.</p>
                                <div className="flex flex-col gap-2">
                                    <Button variant="outline" onClick={() => { setCurrentIndex(0); setLessonDone(false); }}
                                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                        <RefreshCw className="h-4 w-4 mr-2" /> Revoir depuis le début
                                    </Button>
                                    <Button variant="outline" onClick={fetchLessons} disabled={isLoading} className="border-slate-200 text-slate-600">
                                        <RefreshCw className="h-4 w-4 mr-2" /> 5 nouvelles fiches
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {lesson && !isLoading && !lessonDone && (
                            <motion.div key={`lesson-${currentIndex}`}
                                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                                className="space-y-4">
                                {/* Title */}
                                <div className="bg-white/70 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-800">{lesson.title}</h3>
                                                <button onClick={() => speak(lesson.title)}
                                                    className="p-1 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                                                    <Volume2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-500" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                                {lesson.title_fa}
                                            </p>
                                        </div>
                                        <Badge className={`${level.color} border text-xs`}>{selectedLevel}</Badge>
                                    </div>
                                    <p className="text-sm text-slate-600">{lesson.explanation}</p>
                                    {lesson.explanation_fa && (
                                        <p className="text-sm text-slate-500 mt-1 pt-1 border-t border-slate-100" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                            {lesson.explanation_fa}
                                        </p>
                                    )}
                                </div>

                                {/* Rule */}
                                <div className="bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                                    <p className="text-xs font-semibold text-indigo-600 mb-1">📌 Règle</p>
                                    <p className="text-sm text-indigo-800">{lesson.rule}</p>
                                    {lesson.rule_fa && (
                                        <p className="text-sm text-indigo-600 mt-1 pt-1 border-t border-indigo-100" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                            {lesson.rule_fa}
                                        </p>
                                    )}
                                </div>

                                {/* Examples */}
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Exemples</p>
                                    {lesson.examples.map((ex, i) => (
                                        <div key={i} className="bg-white/70 rounded-xl px-4 py-3 border border-slate-100 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">FR</span>
                                                <p className="text-sm font-medium text-slate-700">{ex.fr}</p>
                                                <button onClick={() => speak(ex.fr)}
                                                    className="ml-auto p-1 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500">
                                                    <Volume2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-amber-100 text-amber-600 rounded-full px-2 py-0.5">FA</span>
                                                <p className="text-sm text-amber-700" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                                    {ex.fa}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Tip */}
                                <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                                    <p className="text-xs font-semibold text-amber-600 mb-1">⚠️ Point d'attention</p>
                                    <p className="text-sm text-amber-800">{lesson.tip}</p>
                                    {lesson.tip_fa && (
                                        <p className="text-sm text-amber-700 mt-1 pt-1 border-t border-amber-100" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                                            {lesson.tip_fa}
                                        </p>
                                    )}
                                </div>

                                {/* Save to Sheets */}
                                {isSheetsConfigured() && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSaveLessonToSheet(lesson)}
                                        disabled={isSavingSheet || savedToSheet}
                                        className={savedToSheet ? 'w-full border-green-400 text-green-600' : 'w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                                    >
                                        {isSavingSheet ? (
                                            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Enregistrement...</>
                                        ) : savedToSheet ? (
                                            <><FileSpreadsheet className="h-4 w-4 mr-1.5" />Enregistré dans Sheets !</>
                                        ) : (
                                            <><FileSpreadsheet className="h-4 w-4 mr-1.5" />Enregistrer cette fiche dans Sheets</>
                                        )}
                                    </Button>
                                )}

                                {/* Next */}
                                <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {currentIndex + 1 >= lessons.length ? '🎓 Terminer la leçon' : (
                                        <span className="flex items-center gap-2">
                                            Fiche suivante ({currentIndex + 2}/{lessons.length})
                                            <ChevronRight className="h-4 w-4" />
                                        </span>
                                    )}
                                </Button>
                            </motion.div>
                        )}

                        {!lesson && !isLoading && lessons.length === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-center py-6 text-slate-400">
                                <p className="text-4xl mb-2">📝</p>
                                <p className="text-sm">Cliquez sur "Générer 5 fiches" pour commencer une leçon de grammaire</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Export to Sheets */}
            {lessons.length > 0 && (
                <div className="flex justify-end">
                    <ExportToSheetsButton
                        sheetName="Grammaire"
                        label="Exporter ces fiches"
                        rows={[
                            ['Niveau', 'Titre (FR)', 'Titre (FA)', 'Règle', 'Exemple 1 FR', 'Exemple 1 FA'],
                            ...lessons.map(l => [
                                selectedLevel,
                                l.title,
                                l.title_fa,
                                l.rule,
                                l.examples?.[0]?.fr || '',
                                l.examples?.[0]?.fa || '',
                            ])
                        ]}
                    />
                </div>
            )}

            {/* Revision history */}
            {currentUser && <SectionHistory section="grammar" userEmail={currentUser.email} />}
        </div>
    );
}