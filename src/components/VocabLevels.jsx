import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { translateText as freeTranslate } from '@/api/llmService';
import SectionHistory from "@/components/history/SectionHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Download, CheckCircle, FileSpreadsheet, Check } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import SpeakButton from "@/components/SpeakButton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { appendToSheet, isSheetsConfigured } from "@/lib/googleSheets";
import { getCachedContent, setCachedContent } from "@/utils/aiContentCache";

const LEVELS = [
    { id: 'A1', label: 'A1 – Débutant', color: 'bg-green-100 text-green-700 border-green-200', bg: 'from-green-50 to-emerald-50', border: 'border-green-100', desc: 'Mots du quotidien très simples' },
    { id: 'A2', label: 'A2 – Élémentaire', color: 'bg-teal-100 text-teal-700 border-teal-200', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-100', desc: 'Expressions courantes' },
    { id: 'B1', label: 'B1 – Intermédiaire', color: 'bg-blue-100 text-blue-700 border-blue-200', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100', desc: 'Vocabulaire de conversation' },
    { id: 'B2', label: 'B2 – Avancé', color: 'bg-purple-100 text-purple-700 border-purple-200', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100', desc: 'Expressions idiomatiques' },
    { id: 'C1', label: 'C1 – Expert', color: 'bg-rose-100 text-rose-700 border-rose-200', bg: 'from-rose-50 to-pink-50', border: 'border-rose-100', desc: 'Vocabulaire soutenu et littéraire' },
];

const BUILT_IN_WORDS = {
  A1: [
    { word: 'Bonjour', definition: 'Salutation pour dire bonjour', example_fr: 'Bonjour, comment allez-vous ?' },
    { word: 'Merci', definition: 'Expression de gratitude', example_fr: 'Merci pour votre aide.' },
    { word: 'Maison', definition: 'Lieu où on habite', example_fr: 'Ma maison est grande.' },
    { word: 'Eau', definition: 'Liquide transparent essentiel à la vie', example_fr: 'Je veux boire de l\'eau.' },
    { word: 'Pain', definition: 'Aliment de base fait de farine', example_fr: 'J\'achète du pain à la boulangerie.' },
    { word: 'Famille', definition: 'Ensemble des parents et enfants', example_fr: 'Ma famille est grande.' },
    { word: 'Ami', definition: 'Personne avec qui on a une relation amicale', example_fr: 'Mon ami s\'appelle Ali.' },
    { word: 'Livre', definition: 'Ensemble de pages imprimées', example_fr: 'Je lis un livre.' },
    { word: 'Chat', definition: 'Animal domestique qui miaule', example_fr: 'Le chat dort sur le canapé.' },
    { word: 'Soleil', definition: 'Étoile qui éclaire la Terre', example_fr: 'Le soleil brille aujourd\'hui.' },
  ],
  A2: [
    { word: 'Voyage', definition: 'Déplacement d\'un lieu à un autre', example_fr: 'Mon voyage en France était magnifique.' },
    { word: 'Travail', definition: 'Activité professionnelle rémunérée', example_fr: 'Je vais au travail chaque matin.' },
    { word: 'École', definition: 'Établissement d\'enseignement', example_fr: 'Les enfants vont à l\'école.' },
    { word: 'Restaurant', definition: 'Lieu où on mange des repas préparés', example_fr: 'Nous dînons au restaurant.' },
    { word: 'Voiture', definition: 'Véhicule à moteur pour se déplacer', example_fr: 'Sa voiture est rouge.' },
    { word: 'Jardin', definition: 'Espace planté de fleurs et d\'arbres', example_fr: 'Le jardin est plein de fleurs.' },
    { word: 'Musique', definition: 'Art combinant sons et rythmes', example_fr: 'J\'écoute de la musique le soir.' },
    { word: 'Chaussures', definition: 'Vêtements pour les pieds', example_fr: 'Mes chaussures sont noires.' },
    { word: 'Montagne', definition: 'Élévation naturelle du terrain', example_fr: 'La montagne est couverte de neige.' },
    { word: 'Plage', definition: 'Étendue de sable au bord de la mer', example_fr: 'Nous allons à la plage en été.' },
  ],
  B1: [
    { word: 'Emploi', definition: 'Poste de travail occupé par quelqu\'un', example_fr: 'Il cherche un emploi stable.' },
    { word: 'Environnement', definition: 'Milieu naturel qui nous entoure', example_fr: 'Protégeons l\'environnement.' },
    { word: 'Décision', definition: 'Choix fait après réflexion', example_fr: 'C\'est une décision importante.' },
    { word: 'Expérience', definition: 'Connaissance acquise par la pratique', example_fr: 'Cette expérience m\'a beaucoup appris.' },
    { word: 'Projet', definition: 'Plan d\'action pour l\'avenir', example_fr: 'Notre projet est ambitieux.' },
    { word: 'Société', definition: 'Ensemble des personnes vivant en communauté', example_fr: 'La société évolue rapidement.' },
    { word: 'Culture', definition: 'Ensemble des coutumes et traditions', example_fr: 'La culture persane est riche.' },
    { word: 'Liberté', definition: 'État de ne pas être soumis à une contrainte', example_fr: 'La liberté est un droit fondamental.' },
    { word: 'Patience', definition: 'Capacité d\'attendre sans s\'irriter', example_fr: 'La patience est une vertu.' },
    { word: 'Confiance', definition: 'Sentiment de sécurité envers quelqu\'un', example_fr: 'J\'ai confiance en toi.' },
  ],
  B2: [
    { word: 'Ambiguïté', definition: 'Caractère de ce qui a plusieurs sens', example_fr: 'L\'ambiguïté de cette phrase est intentionnelle.' },
    { word: 'Consensus', definition: 'Accord général entre plusieurs personnes', example_fr: 'Un consensus s\'est dégagé lors du débat.' },
    { word: 'Paradoxe', definition: 'Affirmation qui semble se contredire', example_fr: 'C\'est un paradoxe fascinant.' },
    { word: 'Persévérance', definition: 'Qualité de celui qui persiste malgré les obstacles', example_fr: 'Sa persévérance a payé.' },
    { word: 'Résilience', definition: 'Capacité à se remettre d\'un traumatisme', example_fr: 'Sa résilience est admirable.' },
    { word: 'Empathie', definition: 'Capacité de comprendre les sentiments d\'autrui', example_fr: 'L\'empathie rend les relations plus profondes.' },
    { word: 'Nuance', definition: 'Différence subtile entre deux choses', example_fr: 'Il faut saisir les nuances du texte.' },
    { word: 'Pragmatisme', definition: 'Attitude qui privilégie l\'action efficace', example_fr: 'Son pragmatisme résout les problèmes rapidement.' },
    { word: 'Héritage', definition: 'Ce qui est transmis du passé', example_fr: 'Cet héritage culturel est précieux.' },
    { word: 'Remise en question', definition: 'Action de douter de ses certitudes', example_fr: 'La remise en question est essentielle pour progresser.' },
  ],
  C1: [
    { word: 'Dialectique', definition: 'Art de la discussion par thèse et antithèse', example_fr: 'La dialectique hégélienne influence la philosophie moderne.' },
    { word: 'Épistémologie', definition: 'Étude critique des sciences et de leurs fondements', example_fr: 'L\'épistémologie questionne la nature du savoir.' },
    { word: 'Herméneutique', definition: 'Art de l\'interprétation des textes', example_fr: 'L\'herméneutique biblique est un champ d\'étude ancien.' },
    { word: 'Subversion', definition: 'Action de renverser l\'ordre établi', example_fr: 'La subversion est au cœur de cette œuvre littéraire.' },
    { word: 'Invariant', definition: 'Ce qui reste constant malgré les transformations', example_fr: 'Cet invariant mathématique est remarquable.' },
    { word: 'Dissonance', definition: 'Manque d\'harmonie entre des éléments', example_fr: 'La dissonance cognitive engendre l\'inconfort.' },
    { word: 'Ontologie', definition: 'Branche de la philosophie étudiant l\'être', example_fr: 'L\'ontologie de Heidegger est complexe.' },
    { word: 'Vicariance', definition: 'Capacité d\'un système à remplacer un autre', example_fr: 'La vicariance neuronale permet l\'adaptation.' },
    { word: 'Prolepsis', definition: 'Figure de style consistant à anticiper un événement', example_fr: 'La prolepsis crée un effet de suspense.' },
    { word: 'Atavisme', definition: 'Résurgence d\'un trait ancestral', example_fr: 'Cet atavisme rappelle nos origines lointaines.' },
  ],
};

function downloadPDF(words, level, targetLang) {
    // Build a simple printable HTML page and trigger print-to-PDF
    const rows = words.map((w, i) => `
        <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
            <td style="padding:10px 14px;font-weight:600;font-size:15px">${w.word}</td>
            <td style="padding:10px 14px;color:#64748b;font-size:13px">${w.definition}</td>
            <td style="padding:10px 14px;font-size:15px;direction:rtl;font-family:Vazirmatn,sans-serif">${w.translation}</td>
            <td style="padding:10px 14px;color:#b45309;font-size:12px">${w.pronunciation}</td>
        </tr>
        <tr style="background:${i % 2 === 0 ? '#f1f5f9' : '#f8fafc'}">
            <td colspan="4" style="padding:6px 14px 12px;color:#475569;font-size:12px;font-style:italic">
                🇫🇷 ${w.example_fr}<br/>
                <span style="direction:rtl;display:inline-block;margin-top:4px;font-family:Vazirmatn,sans-serif">${w.example_translated}</span>
            </td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head>
        <meta charset="UTF-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600&display=swap" rel="stylesheet"/>
        <title>Vocabulaire ${level} – ${targetLang}</title>
        <style>
            body{font-family:system-ui,sans-serif;margin:0;padding:32px;color:#1e293b}
            h1{font-size:22px;margin-bottom:4px}
            p.sub{color:#64748b;margin-bottom:20px;font-size:13px}
            table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px #0001}
            th{background:#4f46e5;color:#fff;padding:10px 14px;text-align:left;font-size:13px}
            @media print{body{padding:16px}}
        </style>
    </head><body>
        <h1>📚 Vocabulaire niveau ${level}</h1>
        <p class="sub">Langue cible : ${targetLang} • ${words.length} mots • Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
        <table>
            <thead><tr>
                <th>Mot français</th><th>Définition</th><th>Traduction</th><th>Prononciation</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
}

export default function VocabLevels({ targetLanguage, languageNames }) {
    const [selectedLevel, setSelectedLevel] = useState('A1');
    const [words, setWords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lessonDone, setLessonDone] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [savedToSheet, setSavedToSheet] = useState(false);
    const [isSavingSheet, setIsSavingSheet] = useState(false);

    const level = LEVELS.find(l => l.id === selectedLevel);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
    }, []);

    const fetchWords = async (forceRefresh = false) => {
        setIsLoading(true);
        setWords([]);
        setCurrentIndex(0);
        setLessonDone(false);

        // Check cache first
        if (!forceRefresh) {
            const cachedWords = getCachedContent('vocab', selectedLevel, languageNames[targetLanguage] || 'persan');
            if (cachedWords && cachedWords.length > 0) {
                console.log('Using cached vocab for level:', selectedLevel);
                setWords(cachedWords);
                setIsLoading(false);
                return;
            }
        }

        // Try OpenAI first if API key exists
        const apiKey = localStorage.getItem('app_api_key');
        if (apiKey) {
            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Génère exactement 10 mots français de niveau ${selectedLevel} (${level.desc}) avec pour chacun :
- le mot français
- sa définition simple en français (1 phrase)
- une phrase d'exemple en français
- la traduction du mot en ${languageNames[targetLanguage] || 'persan'}
- la traduction de la phrase d'exemple en ${languageNames[targetLanguage] || 'persan'}
- la prononciation/translittération du mot traduit

Assure-toi que les 10 mots sont variés et correspondent bien au niveau ${selectedLevel}.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            words: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        word: { type: "string" },
                                        definition: { type: "string" },
                                        example_fr: { type: "string" },
                                        translation: { type: "string" },
                                        example_translated: { type: "string" },
                                        pronunciation: { type: "string" }
                                    },
                                    required: ["word", "definition", "example_fr", "translation", "example_translated", "pronunciation"]
                                }
                            }
                        },
                        required: ["words"]
                    }
                });

                const generatedWords = result?.words || [];
                if (generatedWords.length > 0) {
                    setWords(generatedWords);
                    setCachedContent('vocab', selectedLevel, languageNames[targetLanguage] || 'persan', generatedWords);
                    setIsLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Vocab generation error (falling back to built-in):", err);
            }
        }

        // Fallback: built-in words + free translation
        try {
            const builtIn = BUILT_IN_WORDS[selectedLevel] || BUILT_IN_WORDS.A1;
            const targetLang = languageNames[targetLanguage] || 'persan';
            const translatedWords = await Promise.all(
                builtIn.map(async (w) => {
                    const [wordTrans, exampleTrans] = await Promise.all([
                        freeTranslate(w.word, 'Français', targetLang).catch(() => ''),
                        freeTranslate(w.example_fr, 'Français', targetLang).catch(() => ''),
                    ]);
                    return {
                        word: w.word,
                        definition: w.definition,
                        example_fr: w.example_fr,
                        translation: wordTrans,
                        example_translated: exampleTrans,
                        pronunciation: '',
                    };
                })
            );
            setWords(translatedWords);
            if (!apiKey) {
                toast.info("Mode gratuit : vocabulaire prédéfini. Ajoutez une clé API pour du contenu IA illimité.");
            }
        } catch (err) {
            console.error("Built-in vocab error:", err);
            toast.error("Erreur lors du chargement du vocabulaire.");
        }

        setIsLoading(false);
    };

    const { speak, speakingKey } = useSpeech();

    const handleSaveWordToSheet = async () => {
        if (!wordData) return;
        setIsSavingSheet(true);
        await appendToSheet('Vocabulaire', [[
            wordData.word,
            wordData.translation,
            wordData.pronunciation || '',
            wordData.definition || '',
            wordData.example_fr || '',
            wordData.example_translated || '',
            selectedLevel,
        ]]);
        setSavedToSheet(true);
        setIsSavingSheet(false);
        toast.success("Mot enregistré dans Google Sheets !");
        setTimeout(() => setSavedToSheet(false), 3000);
    };

    const handleSaveAllToSheet = async () => {
        if (!words.length) return;
        setIsSavingSheet(true);
        const rows = words.map(w => [
            w.word, w.translation, w.pronunciation || '', w.definition || '',
            w.example_fr || '', w.example_translated || '', selectedLevel,
        ]);
        await appendToSheet('Vocabulaire', [
            ['Mot FR', 'Traduction', 'Prononciation', 'Définition', 'Exemple FR', 'Exemple Traduit', 'Niveau'],
            ...rows,
        ]);
        setSavedToSheet(true);
        setIsSavingSheet(false);
        toast.success(`${words.length} mots envoyés dans Google Sheets !`);
        setTimeout(() => setSavedToSheet(false), 3000);
    };

    const handleNext = () => {
        setSavedToSheet(false);
        // Save current word to history
        if (wordData && currentUser) {
            base44.entities.SessionHistory.create({
                user_email: currentUser.email,
                section: 'vocab',
                word_original: wordData.word,
                word_translation: wordData.translation,
                word_pronunciation: wordData.pronunciation || '',
                word_definition: wordData.definition || '',
                topic: `Niveau ${selectedLevel}`,
                source_language: 'français',
                target_language: languageNames[targetLanguage] || 'persan',
            }).catch(() => {});
        }
        if (currentIndex + 1 >= words.length) {
            setLessonDone(true);
        } else {
            setCurrentIndex(i => i + 1);
        }
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setLessonDone(false);
    };

    const wordData = words[currentIndex];

    return (
        <div className="space-y-4">
            {/* Level Selector */}
            <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                    <button
                        key={l.id}
                        onClick={() => { setSelectedLevel(l.id); setWords([]); setCurrentIndex(0); setLessonDone(false); }}
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
                            <p className="text-xs text-slate-500 mt-1">{level.desc}</p>
                        </div>
                        <Button
                            onClick={fetchWords}
                            disabled={isLoading}
                            size="sm"
                            className="bg-white/80 text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-sm"
                            variant="outline"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                            {words.length > 0 ? '10 nouveaux mots' : 'Générer 10 mots'}
                        </Button>
                    </div>

                    {/* Progress bar */}
                    {words.length > 0 && !lessonDone && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Mot {currentIndex + 1} sur {words.length}</span>
                                <span>{Math.round(((currentIndex + 1) / words.length) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-indigo-500 rounded-full"
                                    animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center justify-center py-8 gap-2 text-slate-500"
                            >
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                <span>Génération de 10 mots...</span>
                            </motion.div>
                        )}

                        {/* Lesson done */}
                        {lessonDone && (
                            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                                <div className="text-5xl">🎉</div>
                                <h3 className="text-xl font-bold text-slate-800">Leçon terminée !</h3>
                                <p className="text-slate-500 text-sm">Vous avez vu les {words.length} mots du niveau {selectedLevel}.</p>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() => downloadPDF(words, selectedLevel, languageNames[targetLanguage] || 'Traduit')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Télécharger les mots en PDF
                                    </Button>
                                    {isSheetsConfigured() && (
                                        <Button
                                            variant="outline"
                                            onClick={handleSaveAllToSheet}
                                            disabled={isSavingSheet || savedToSheet}
                                            className={savedToSheet ? 'border-green-400 text-green-600' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                                        >
                                            {isSavingSheet ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : savedToSheet ? <Check className="h-4 w-4 mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                                            {savedToSheet ? 'Envoyé dans Sheets !' : `Exporter les ${words.length} mots dans Sheets`}
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={handleRestart} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                        <RefreshCw className="h-4 w-4 mr-2" /> Revoir depuis le début
                                    </Button>
                                    <Button variant="outline" onClick={fetchWords} disabled={isLoading} className="border-slate-200 text-slate-600">
                                        <RefreshCw className="h-4 w-4 mr-2" /> 10 nouveaux mots
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Word card */}
                        {wordData && !isLoading && !lessonDone && (
                            <motion.div
                                key={`word-${currentIndex}`}
                                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                                className="space-y-4"
                            >
                                {/* French word */}
                                <div className="bg-white/70 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-slate-800">{wordData.word}</span>
                                        <SpeakButton text={wordData.word} lang="fr" speakFn={speak} activeKey={speakingKey} itemKey={`word-fr-${currentIndex}`} />
                                        <Badge className="bg-blue-100 text-blue-600 border-0 text-xs">Français</Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 italic">{wordData.definition}</p>
                                    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-medium text-indigo-600">Ex : </span>
                                            {wordData.example_fr}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-slate-400">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs">traduction</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>

                                {/* Translated word */}
                                <div className="bg-amber-50/80 rounded-xl p-4 space-y-2 border border-amber-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className="text-2xl font-bold text-slate-800"
                                            dir={['fa', 'ar'].includes(targetLanguage) ? 'rtl' : 'ltr'}
                                            style={['fa', 'ar'].includes(targetLanguage) ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                                        >
                                            {wordData.translation}
                                        </span>
                                        <SpeakButton text={wordData.translation} lang={targetLanguage} speakFn={speak} activeKey={speakingKey} itemKey={`word-fa-${currentIndex}`} />
                                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{languageNames[targetLanguage] || 'Traduit'}</Badge>
                                    </div>
                                    {wordData.pronunciation && (
                                        <p className="text-sm text-amber-700">/{wordData.pronunciation}/</p>
                                    )}
                                    <div className="bg-white/60 rounded-lg px-3 py-2 border border-amber-100">
                                        <p
                                            className="text-sm text-slate-600"
                                            dir={['fa', 'ar'].includes(targetLanguage) ? 'rtl' : 'ltr'}
                                            style={['fa', 'ar'].includes(targetLanguage) ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                                        >
                                            {wordData.example_translated}
                                        </p>
                                    </div>
                                </div>

                                {/* Save to Sheets */}
                                {isSheetsConfigured() && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSaveWordToSheet}
                                        disabled={isSavingSheet || savedToSheet}
                                        className={savedToSheet ? 'w-full border-green-400 text-green-600' : 'w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                                    >
                                        {isSavingSheet ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : savedToSheet ? <Check className="h-4 w-4 mr-1.5" /> : <FileSpreadsheet className="h-4 w-4 mr-1.5" />}
                                        {savedToSheet ? 'Enregistré dans Sheets !' : 'Sauvegarder dans Google Sheets'}
                                    </Button>
                                )}

                                {/* Navigation */}
                                <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {currentIndex + 1 >= words.length ? (
                                        <><CheckCircle className="h-4 w-4 mr-2" /> Terminer la leçon</>
                                    ) : (
                                        <>Mot suivant ({currentIndex + 2}/{words.length})</>
                                    )}
                                </Button>
                            </motion.div>
                        )}

                        {!wordData && !isLoading && words.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-center py-6 text-slate-400"
                            >
                                <p className="text-4xl mb-2">📖</p>
                                <p className="text-sm">Cliquez sur "Générer 10 mots" pour commencer une leçon</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Historique de révision */}
            {currentUser && <SectionHistory section="vocab" userEmail={currentUser.email} />}
        </div>
    );
}