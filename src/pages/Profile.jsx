import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    Languages, Target, Zap, Award, BookOpen, Star, Brain,
    Settings as SettingsIcon, Key, Check, Eye, EyeOff, Info,
    RotateCcw, History, BarChart2, AlertTriangle, Trash2, UserX, Loader2
} from "lucide-react";
import DailyReminder from "@/components/DailyReminder";
import GoogleSheetsSettings from "@/components/GoogleSheetsSettings";

const API_KEY_STORAGE = 'app_api_key';

function StatCard({ icon: Icon, value, label, color, delay = 0 }) {
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
            <Card className="border-0 shadow-md bg-white/80 dark:bg-card backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${color}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function Profile() {
    const [currentUser, setCurrentUser] = useState(null);

    // API Key state
    const [apiKey, setApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    // Reset / delete state
    const [resetting, setResetting] = useState({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        base44.auth.me().then(setCurrentUser).catch(() => {});
        const stored = localStorage.getItem(API_KEY_STORAGE) || '';
        setSavedKey(stored);
        setApiKey(stored);
    }, []);

    const { data: translations = [] } = useQuery({
        queryKey: ['translations'],
        queryFn: () => base44.entities.Translation.list('-created_date', 100),
    });

    const { data: progressList = [] } = useQuery({
        queryKey: ['user-progress-dash', currentUser?.email],
        queryFn: () => base44.entities.UserProgress.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });

    const { data: sessionHistory = [] } = useQuery({
        queryKey: ['session-history-dash', currentUser?.email],
        queryFn: () => base44.entities.SessionHistory.filter({ user_email: currentUser.email }),
        enabled: !!currentUser?.email,
    });

    const { data: vocabLists = [] } = useQuery({
        queryKey: ['vocabLists-dash'],
        queryFn: () => base44.entities.VocabList.list('-created_date'),
    });

    const progress = progressList[0] || {};
    const quizHistory = sessionHistory.filter(s => s.section === 'quiz');
    const vocabHistory = sessionHistory.filter(s => s.section === 'vocab');
    const grammarHistory = sessionHistory.filter(s => s.section === 'grammar');
    const correctQuiz = quizHistory.filter(s => s.quiz_result === 'correct').length;
    const quizAccuracy = quizHistory.length > 0 ? Math.round((correctQuiz / quizHistory.length) * 100) : 0;
    const recentActivity = [...sessionHistory].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
    const sectionColors = {
        vocab: 'bg-amber-100 text-amber-700',
        quiz: 'bg-indigo-100 text-indigo-700',
        grammar: 'bg-green-100 text-green-700',
    };
    const maskedKey = savedKey ? savedKey.slice(0, 6) + '••••••••••••' + savedKey.slice(-4) : '';

    const [isValidating, setIsValidating] = useState(false);
    const [validationStatus, setValidationStatus] = useState(null); // null | 'valid' | 'invalid' | 'no_credits'

    const handleSaveKey = async () => {
        if (!apiKey.trim()) { toast.error("Veuillez entrer une cle API valide."); return; }

        setIsValidating(true);
        setValidationStatus(null);

        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-llm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    prompt: 'Reponds juste "ok" en JSON.',
                    response_json_schema: { type: 'object', properties: { status: { type: 'string' } } },
                    api_key: apiKey.trim(),
                })
            });

            const data = await res.json();

            if (res.ok && !data.error) {
                localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
                setSavedKey(apiKey.trim());
                setSaved(true);
                setValidationStatus('valid');
                toast.success("Cle API valide et enregistree !");
            } else {
                const errMsg = data.error || 'Erreur inconnue';
                if (errMsg.includes('invalide') || errMsg.includes('401')) {
                    setValidationStatus('invalid');
                    toast.error("Cle API invalide. Verifiez que vous avez copie la bonne cle.");
                } else if (errMsg.includes('credits') || errMsg.includes('quota') || errMsg.includes('paiement') || errMsg.includes('Limite')) {
                    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
                    setSavedKey(apiKey.trim());
                    setValidationStatus('no_credits');
                    toast.warning("Cle enregistree mais votre compte OpenAI n'a pas de credits. Ajoutez un moyen de paiement sur platform.openai.com/account/billing");
                } else {
                    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
                    setSavedKey(apiKey.trim());
                    setSaved(true);
                    toast.warning("Cle enregistree mais erreur: " + errMsg);
                }
            }
        } catch (err) {
            localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
            setSavedKey(apiKey.trim());
            setSaved(true);
            toast.warning("Cle enregistree. Impossible de verifier en ligne.");
        }

        setIsValidating(false);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClearKey = () => {
        localStorage.removeItem(API_KEY_STORAGE);
        setSavedKey('');
        setApiKey('');
        toast.info("Clé API supprimée.");
    };

    const handleReset = async (section) => {
        setResetting(r => ({ ...r, [section]: true }));
        if (section === 'history') {
            const items = await base44.entities.Translation.list();
            await Promise.all(items.map(t => base44.entities.Translation.delete(t.id)));
            localStorage.removeItem('offline_translation_cache');
            toast.success("Historique réinitialisé !");
        } else if (section === 'vocab') {
            const items = await base44.entities.VocabList.list();
            await Promise.all(items.map(v => base44.entities.VocabList.delete(v.id)));
            toast.success("Listes de vocabulaire réinitialisées !");
        } else if (section === 'progress') {
            const user = await base44.auth.me();
            const items = await base44.entities.UserProgress.filter({ user_email: user.email });
            await Promise.all(items.map(p => base44.entities.UserProgress.delete(p.id)));
            toast.success("Progression réinitialisée !");
        }
        setResetting(r => ({ ...r, [section]: false }));
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'SUPPRIMER') return;
        setIsDeleting(true);
        const user = await base44.auth.me();
        const [t, v, p, h] = await Promise.all([
            base44.entities.Translation.list(),
            base44.entities.VocabList.list(),
            base44.entities.UserProgress.filter({ user_email: user.email }),
            base44.entities.SessionHistory.filter({ user_email: user.email }),
        ]);
        await Promise.all([
            ...t.map(x => base44.entities.Translation.delete(x.id)),
            ...v.map(x => base44.entities.VocabList.delete(x.id)),
            ...p.map(x => base44.entities.UserProgress.delete(x.id)),
            ...h.map(x => base44.entities.SessionHistory.delete(x.id)),
        ]);
        localStorage.clear();
        toast.success("Compte supprimé. Déconnexion...");
        setTimeout(() => base44.auth.logout('/'), 1500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/20 dark:from-background dark:via-background dark:to-background pb-24">
            <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet" />

            {/* ── DASHBOARD SECTION ── */}
            <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

                {/* Welcome banner */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
                        <p className="text-indigo-200 text-sm mb-1">Bienvenue 👋</p>
                        <h2 className="text-xl font-bold">{currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Apprenant'}</h2>
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-4 w-4 text-amber-300" />
                                <span className="text-sm font-semibold">{progress.streak || 0} jours de série</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-amber-300" />
                                <span className="text-sm font-semibold">{progress.total_points || 0} pts</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats grid */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Statistiques globales</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={Languages} value={translations.length} label="Mots traduits" color="bg-indigo-100 text-indigo-600" delay={0} />
                        <StatCard icon={Target} value={`${quizAccuracy}%`} label="Précision Quiz" color="bg-emerald-100 text-emerald-600" delay={0.05} />
                        <StatCard icon={BookOpen} value={vocabHistory.length} label="Mots en Vocab" color="bg-amber-100 text-amber-600" delay={0.1} />
                        <StatCard icon={Brain} value={grammarHistory.length} label="Exercices Grammaire" color="bg-purple-100 text-purple-600" delay={0.15} />
                    </div>
                </div>

                {/* Progress bars */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Progression par section</h3>
                    <Card className="border-0 shadow-md bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-4 space-y-4">
                            {[
                                { label: 'Quiz', value: quizHistory.length, color: 'bg-indigo-500', icon: Target },
                                { label: 'Vocabulaire', value: vocabHistory.length, color: 'bg-amber-500', icon: Star },
                                { label: 'Grammaire', value: grammarHistory.length, color: 'bg-green-500', icon: Brain },
                            ].map(({ label, value, color, icon: Icon }) => (
                                <div key={label} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
                                        </div>
                                        <span className="text-slate-400 dark:text-slate-500 text-xs">{value} sessions</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full ${color} rounded-full`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${value > 0 ? Math.min(100, (value / Math.max(quizHistory.length, vocabHistory.length, grammarHistory.length, 1)) * 100) : 0}%` }}
                                            transition={{ duration: 0.8, delay: 0.3 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent activity */}
                {recentActivity.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Activité récente</h3>
                        <Card className="border-0 shadow-md bg-white/80 dark:bg-card backdrop-blur-sm">
                            <CardContent className="p-4 space-y-3">
                                {recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Badge className={`${sectionColors[item.section]} border-0 text-xs shrink-0 capitalize`}>{item.section}</Badge>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.word_original}</span>
                                            <span className="text-sm text-slate-400 shrink-0" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>{item.word_translation}</span>
                                        </div>
                                        {item.quiz_result && (
                                            <span className={`text-xs font-semibold shrink-0 ${item.quiz_result === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {item.quiz_result === 'correct' ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Vocab lists */}
                {vocabLists.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Listes de vocabulaire</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {vocabLists.slice(0, 4).map(list => (
                                <Card key={list.id} className="border-0 shadow-sm bg-white/80 dark:bg-card">
                                    <CardContent className="p-3">
                                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{list.name}</p>
                                        <p className="text-xs text-slate-400">{(list.words || []).length} mots</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Badges */}
                {(progress.badges || []).length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Badges obtenus</h3>
                        <div className="flex flex-wrap gap-2">
                            {progress.badges.map(badge => (
                                <Badge key={badge} className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">{badge}</Badge>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── SETTINGS SECTION ── */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Paramètres</h3>
                </div>

                {/* API Key */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-6 space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                                    <Key className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Clé API</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Nécessaire pour les traductions et l'IA</p>
                                </div>
                                {savedKey && <Badge className="ml-auto bg-green-100 text-green-700 border-0">✓ Configurée</Badge>}
                            </div>
                            {savedKey && (
                                <div className="bg-slate-50 dark:bg-secondary rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <code className="text-sm text-slate-600 font-mono">{maskedKey}</code>
                                    <Button variant="ghost" size="sm" onClick={handleClearKey} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs">Supprimer</Button>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{savedKey ? 'Modifier la clé API' : 'Entrez votre clé API'}</label>
                                <div className="relative">
                                    <Input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="pr-10 font-mono text-sm bg-white border-slate-200"
                                        onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                                    />
                                    <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button onClick={handleSaveKey} disabled={!apiKey.trim() || apiKey === savedKey || isValidating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isValidating ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verification...</>
                                ) : saved ? (
                                    <><Check className="h-4 w-4 mr-2" /> Enregistree !</>
                                ) : 'Enregistrer et verifier la cle API'}
                            </Button>
                            {validationStatus === 'valid' && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-xl">
                                    <Check className="h-4 w-4" />
                                    <span>Cle API valide ! Les traductions fonctionnent.</span>
                                </div>
                            )}
                            {validationStatus === 'invalid' && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Cle API invalide. Verifiez que votre cle commence par sk- et est copiee correctement.</span>
                                </div>
                            )}
                            {validationStatus === 'no_credits' && (
                                <div className="space-y-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                    <div className="flex items-center gap-2 text-sm text-amber-700">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <span className="font-medium">Votre compte OpenAI n'a pas de credits</span>
                                    </div>
                                    <p className="text-xs text-amber-600">Les comptes OpenAI gratuits n'ont pas acces a l'API. Vous devez :</p>
                                    <ol className="text-xs text-amber-700 list-decimal list-inside space-y-1">
                                        <li>Aller sur <strong>platform.openai.com/account/billing</strong></li>
                                        <li>Ajouter un moyen de paiement (carte bancaire)</li>
                                        <li>Ajouter au moins 5$ de credits</li>
                                    </ol>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Info */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card className="border-0 shadow-md bg-indigo-50/80">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-700">
                                <Info className="h-4 w-4" />
                                <span className="text-sm font-semibold">Comment obtenir une clé API ?</span>
                            </div>
                            <ol className="text-sm text-indigo-700 space-y-2 list-decimal list-inside">
                                <li>Créez un compte sur <strong>openai.com</strong> ou le service IA de votre choix</li>
                                <li>Accédez à la section <strong>API Keys</strong> dans votre tableau de bord</li>
                                <li>Générez une nouvelle clé et copiez-la ici</li>
                                <li>La clé est stockée localement sur votre appareil</li>
                            </ol>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Google Sheets */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                    <GoogleSheetsSettings />
                </motion.div>

                {/* Daily Reminder */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <DailyReminder />
                </motion.div>

                {/* Reset data */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                    <RotateCcw className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Réinitialiser les données</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Supprime définitivement les données de chaque section</p>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700">Ces actions sont irréversibles. Vos données seront supprimées définitivement.</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { key: 'history', icon: History, label: 'Historique des traductions', desc: 'Supprime tous les mots traduits', color: 'bg-indigo-100 text-indigo-600' },
                                    { key: 'vocab', icon: Star, label: 'Listes de vocabulaire', desc: 'Supprime toutes les listes et mots sauvegardés', color: 'bg-amber-100 text-amber-600' },
                                    { key: 'progress', icon: BarChart2, label: 'Progression & Stats', desc: 'Remet à zéro les points, badges et série', color: 'bg-purple-100 text-purple-600' },
                                ].map(({ key, icon: Icon, label, desc, color }) => (
                                    <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-secondary border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => handleReset(key)} disabled={resetting[key]}
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shrink-0">
                                            {resetting[key] ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : 'Réinitialiser'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Delete account */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl"><UserX className="h-5 w-5 text-red-600" /></div>
                                <div>
                                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Supprimer le compte</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Supprime définitivement toutes vos données</p>
                                </div>
                            </div>
                            {!showDeleteDialog ? (
                                <Button variant="outline" onClick={() => setShowDeleteDialog(true)} className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400">
                                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer mon compte
                                </Button>
                            ) : (
                                <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-red-700 font-medium">Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées.</p>
                                    </div>
                                    <p className="text-xs text-red-600">Tapez <strong>SUPPRIMER</strong> pour confirmer :</p>
                                    <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="SUPPRIMER" className="border-red-300 bg-white focus-visible:ring-red-400 font-mono" />
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }} className="flex-1" disabled={isDeleting}>Annuler</Button>
                                        <Button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'SUPPRIMER' || isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                                            {isDeleting ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />} Supprimer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* App info */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
                    <Card className="border-0 shadow-md bg-white/60 dark:bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-xl"><SettingsIcon className="h-4 w-4 text-slate-500" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Traductor Persan</p>
                                    <p className="text-xs text-slate-400">Version 1.0 • Données stockées localement</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}