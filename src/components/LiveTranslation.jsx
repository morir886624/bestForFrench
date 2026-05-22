import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, BookmarkPlus, Check, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from 'lodash';
import { toast } from "sonner";
import { saveToOfflineCache } from "@/components/offlineCache";
import { appendToSheet, isSheetsConfigured } from "@/lib/googleSheets";

export default function LiveTranslation({ sourceLanguage, targetLanguage, languageNames }) {
    const [inputText, setInputText] = useState('');
    const [translation, setTranslation] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isSavingSheet, setIsSavingSheet] = useState(false);
    const [savedSheet, setSavedSheet] = useState(false);
    const queryClient = useQueryClient();

    const isRTL = (lang) => ['fa', 'ar'].includes(lang);

    const translateText = useCallback(
        debounce(async (text) => {
            if (!text.trim()) {
                setTranslation('');
                setSaved(false);
                return;
            }
            setIsTranslating(true);
            setSaved(false);

            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Traduis "${text}" du ${languageNames[sourceLanguage]} vers le ${languageNames[targetLanguage]}. Reponds UNIQUEMENT avec la traduction, rien d'autre.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            translation: { type: "string" }
                        }
                    }
                });
                setTranslation(result?.translation || '');
            } catch (err) {
                console.error("Live translation error:", err);
                // Silent fail for live translation - don't show toast
            }
            setIsTranslating(false);
        }, 500),
        [sourceLanguage, targetLanguage, languageNames]
    );

    useEffect(() => {
        translateText(inputText);
    }, [inputText, translateText]);

    // Reset saved state when input or languages change
    useEffect(() => {
        setSaved(false);
        setSavedSheet(false);
    }, [inputText, sourceLanguage, targetLanguage]);

    const handleSaveToSheet = async () => {
        if (!inputText.trim() || !translation) return;
        setIsSavingSheet(true);
        const now = new Date().toLocaleDateString('fr-FR');
        await appendToSheet('Traductions', [
            [inputText.trim(), translation, languageNames[sourceLanguage], languageNames[targetLanguage], now]
        ]);
        setSavedSheet(true);
        setIsSavingSheet(false);
        toast.success("Enregistré dans Google Sheets !");
    };

    const handleSave = async () => {
        if (!inputText.trim() || !translation) return;
        setIsSaving(true);

        // Get pronunciation + definition via a second LLM call
        let details;
        try {
            details = await base44.integrations.Core.InvokeLLM({
                prompt: `Pour le mot/phrase "${inputText}" en ${languageNames[sourceLanguage]}, dont la traduction en ${languageNames[targetLanguage]} est "${translation}":
1. Donne la prononciation/translitteration de la traduction
2. Donne une courte definition en francais`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        pronunciation: { type: "string" },
                        definition: { type: "string" }
                    }
                }
            });
        } catch (err) {
            console.error("Details generation error:", err);
            toast.error("Erreur lors de la recuperation des details.");
            setIsSaving(false);
            return;
        }

        const translationData = {
            original_word: inputText.trim(),
            source_language: languageNames[sourceLanguage],
            target_language: languageNames[targetLanguage],
            persian_translation: translation,
            pronunciation: details?.pronunciation || '',
            definition: details?.definition || '',
        };

        await base44.entities.Translation.create(translationData);
        saveToOfflineCache(translationData);
        queryClient.invalidateQueries({ queryKey: ['translations'] });

        setSaved(true);
        setIsSaving(false);
        toast.success("Traduction enregistree dans l'historique !");
    };

    return (
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-card backdrop-blur-lg overflow-hidden">
            <CardContent className="p-0">
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
                    {/* Input side */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-slate-500">{languageNames[sourceLanguage]}</span>
                        </div>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Tapez pour traduire en temps réel..."
                            className="w-full h-32 resize-none bg-transparent text-lg text-foreground focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            dir={isRTL(sourceLanguage) ? 'rtl' : 'ltr'}
                            style={isRTL(sourceLanguage) ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                        />
                    </div>

                    {/* Output side */}
                    <div className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 relative">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-amber-700">{languageNames[targetLanguage]}</span>
                            {isTranslating && (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                            )}
                        </div>
                        <div
                            className="w-full h-32 text-xl text-slate-800 overflow-auto"
                            dir={isRTL(targetLanguage) ? 'rtl' : 'ltr'}
                            style={isRTL(targetLanguage) ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                        >
                            <AnimatePresence mode="wait">
                                {translation && (
                                    <motion.p
                                        key={translation}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {translation}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Save buttons */}
                {translation && inputText.trim() && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 flex-wrap">
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || saved}
                            className={saved ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                        >
                            {isSaving ? (
                                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Enregistrement...</>
                            ) : saved ? (
                                <><Check className="h-4 w-4 mr-1.5" />Enregistré !</>
                            ) : (
                                <><BookmarkPlus className="h-4 w-4 mr-1.5" />Enregistrer dans l'historique</>
                            )}
                        </Button>
                        {isSheetsConfigured() && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSaveToSheet}
                                disabled={isSavingSheet || savedSheet}
                                className={savedSheet ? 'border-green-400 text-green-600' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}
                            >
                                {isSavingSheet ? (
                                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Sheets...</>
                                ) : savedSheet ? (
                                    <><Check className="h-4 w-4 mr-1.5" />Dans Sheets !</>
                                ) : (
                                    <><FileSpreadsheet className="h-4 w-4 mr-1.5" />Enregistrer dans Sheets</>
                                )}
                            </Button>
                        )}
                    </div>
                )}

                {/* Arrow indicator for desktop */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
                    <ArrowRight className="h-5 w-5 text-indigo-500" />
                </div>
            </CardContent>
        </Card>
    );
}