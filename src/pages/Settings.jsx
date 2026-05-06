import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Key, Check, Eye, EyeOff, ArrowLeft, Info, RotateCcw, History, Star, BarChart2, AlertTriangle, Trash2, UserX } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import DailyReminder from "@/components/DailyReminder";
import GoogleSheetsSettings from "@/components/GoogleSheetsSettings";

const API_KEY_STORAGE = 'app_api_key';

export default function Settings() {
    const [apiKey, setApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(API_KEY_STORAGE) || '';
        setSavedKey(stored);
        setApiKey(stored);
    }, []);

    const handleSave = () => {
        if (!apiKey.trim()) { toast.error("Veuillez entrer une clé API valide."); return; }
        localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
        setSavedKey(apiKey.trim());
        setSaved(true);
        toast.success("Clé API enregistrée !");
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClear = () => {
        localStorage.removeItem(API_KEY_STORAGE);
        setSavedKey('');
        setApiKey('');
        toast.info("Clé API supprimée.");
    };

    const maskedKey = savedKey ? savedKey.slice(0, 6) + '••••••••••••' + savedKey.slice(-4) : '';

    const [resetting, setResetting] = useState({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'SUPPRIMER') return;
        setIsDeleting(true);
        try {
            // Delete all user data first
            const user = await base44.auth.me();
            const [translations, vocabLists, progressItems, history] = await Promise.all([
                base44.entities.Translation.list(),
                base44.entities.VocabList.list(),
                base44.entities.UserProgress.filter({ user_email: user.email }),
                base44.entities.SessionHistory.filter({ user_email: user.email }),
            ]);
            await Promise.all([
                ...translations.map(t => base44.entities.Translation.delete(t.id)),
                ...vocabLists.map(v => base44.entities.VocabList.delete(v.id)),
                ...progressItems.map(p => base44.entities.UserProgress.delete(p.id)),
                ...history.map(h => base44.entities.SessionHistory.delete(h.id)),
            ]);
            localStorage.clear();
            toast.success("Compte supprimé. Déconnexion...");
            setTimeout(() => base44.auth.logout('/'), 1500);
        } catch (e) {
            toast.error("Erreur lors de la suppression du compte.");
            setIsDeleting(false);
        }
    };

    const handleReset = async (section) => {
        setResetting(r => ({ ...r, [section]: true }));
        try {
            if (section === 'history') {
                // Reset translation history
                const items = await base44.entities.Translation.list();
                await Promise.all(items.map(t => base44.entities.Translation.delete(t.id)));
                // Also clear offline cache
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
        } catch (e) {
            toast.error("Erreur lors de la réinitialisation.");
        }
        setResetting(r => ({ ...r, [section]: false }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/20 dark:from-background dark:via-background dark:to-background p-4 pb-20">
            <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet" />

            <div className="max-w-lg mx-auto space-y-6 pt-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <a href="/" className="p-2 rounded-xl bg-white/80 border border-slate-200 hover:bg-indigo-50 transition-colors">
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </a>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Paramètres</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Configuration de l'application</p>
                    </div>
                </div>

                {/* API Key Card */}
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

                            {/* Current key display */}
                            {savedKey && (
                                <div className="bg-slate-50 dark:bg-secondary rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <code className="text-sm text-slate-600 font-mono">{maskedKey}</code>
                                    <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs">
                                        Supprimer
                                    </Button>
                                </div>
                            )}

                            {/* Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {savedKey ? 'Modifier la clé API' : 'Entrez votre clé API'}
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="pr-10 font-mono text-sm bg-white border-slate-200"
                                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={!apiKey.trim() || apiKey === savedKey}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {saved ? <><Check className="h-4 w-4 mr-2" /> Enregistrée !</> : 'Enregistrer la clé API'}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Info card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
                    <GoogleSheetsSettings />
                </motion.div>

                {/* Daily Reminder */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                    <DailyReminder />
                </motion.div>

                {/* Reset section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
                                            <div className={`p-2 rounded-lg ${color}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReset(key)}
                                            disabled={resetting[key]}
                                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shrink-0"
                                        >
                                            {resetting[key] ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : 'Réinitialiser'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Delete Account */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                    <Card className="border-0 shadow-xl bg-white/80 dark:bg-card backdrop-blur-sm">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                    <UserX className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-800 dark:text-slate-100">Supprimer le compte</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Supprime définitivement toutes vos données</p>
                                </div>
                            </div>
                            {!showDeleteDialog ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer mon compte
                                </Button>
                            ) : (
                                <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-red-700 font-medium">
                                            Cette action est <strong>irréversible</strong>. Toutes vos traductions, listes, progression et données seront supprimées.
                                        </p>
                                    </div>
                                    <p className="text-xs text-red-600">Tapez <strong>SUPPRIMER</strong> pour confirmer :</p>
                                    <Input
                                        value={deleteConfirmText}
                                        onChange={e => setDeleteConfirmText(e.target.value)}
                                        placeholder="SUPPRIMER"
                                        className="border-red-300 bg-white focus-visible:ring-red-400 font-mono"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}
                                            className="flex-1"
                                            disabled={isDeleting}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            onClick={handleDeleteAccount}
                                            disabled={deleteConfirmText !== 'SUPPRIMER' || isDeleting}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            {isDeleting ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                            Supprimer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* App info */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="border-0 shadow-md bg-white/60 dark:bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-xl">
                                    <SettingsIcon className="h-4 w-4 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Traductor Persan</p>
                                    <p className="text-xs text-slate-400">Version 1.0 • Données stockées localement</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}