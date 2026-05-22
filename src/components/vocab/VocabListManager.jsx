import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, BookMarked, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import SpeakButton from "@/components/SpeakButton";
import ExportToSheetsButton from "@/components/ExportToSheetsButton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const COLORS = [
    { label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', hex: 'indigo' },
    { label: 'Rose', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', hex: 'rose' },
    { label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', hex: 'amber' },
    { label: 'Emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', hex: 'emerald' },
    { label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hex: 'purple' },
];

export default function VocabListManager({ translations, targetLanguage, languageNames }) {
    const [selectedListId, setSelectedListId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListColor, setNewListColor] = useState('indigo');
    const [suggestingWords, setSuggestingWords] = useState(false);
    const queryClient = useQueryClient();

    const { data: lists = [] } = useQuery({
        queryKey: ['vocabLists'],
        queryFn: () => base44.entities.VocabList.list('-created_date'),
    });

    const createListMutation = useMutation({
        mutationFn: (data) => base44.entities.VocabList.create(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vocabLists'] }); setShowCreate(false); setNewListName(''); },
    });

    const updateListMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.VocabList.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['vocabLists'] });
            const previous = queryClient.getQueryData(['vocabLists']);
            queryClient.setQueryData(['vocabLists'], (old = []) =>
                old.map(list => list.id === id ? { ...list, ...data } : list)
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(['vocabLists'], context.previous);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocabLists'] }),
    });

    const deleteListMutation = useMutation({
        mutationFn: (id) => base44.entities.VocabList.delete(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['vocabLists'] });
            const previous = queryClient.getQueryData(['vocabLists']);
            queryClient.setQueryData(['vocabLists'], (old = []) => old.filter(l => l.id !== id));
            setSelectedListId(null);
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) queryClient.setQueryData(['vocabLists'], context.previous);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocabLists'] }),
    });

    const selectedList = lists.find(l => l.id === selectedListId);

    const handleCreateList = () => {
        if (!newListName.trim()) return;
        createListMutation.mutate({
            name: newListName.trim(),
            color: newListColor,
            words: [],
            source_language: 'français',
            target_language: languageNames[targetLanguage] || 'persan',
        });
    };

    const handleAddWord = (list, translation) => {
        const alreadyIn = (list.words || []).some(w => w.original === translation.original_word);
        if (alreadyIn) { toast.info("Mot déjà dans la liste"); return; }
        const updatedWords = [...(list.words || []), {
            original: translation.original_word,
            translation: translation.persian_translation,
            pronunciation: translation.pronunciation || '',
            definition: translation.definition || '',
        }];
        updateListMutation.mutate({ id: list.id, data: { words: updatedWords } });
        toast.success("Mot ajouté à la liste !");
    };

    const handleRemoveWord = (list, wordOriginal) => {
        const updatedWords = (list.words || []).filter(w => w.original !== wordOriginal);
        updateListMutation.mutate({ id: list.id, data: { words: updatedWords } });
    };

    const handleSuggestWords = async (list) => {
        if (!translations.length) { toast.error("Aucun historique de traduction disponible."); return; }
        setSuggestingWords(true);
        const existingWords = (list.words || []).map(w => w.original).join(', ');
        const historyWords = translations.slice(0, 30).map(tr => tr.original_word).join(', ');

        let result;
        try {
            result = await base44.integrations.Core.InvokeLLM({
                prompt: `Tu es un assistant pedagogique. L'utilisateur apprend le ${languageNames[targetLanguage]}.
Liste actuelle: ${existingWords || 'vide'}.
Historique de traduction: ${historyWords}.
Suggere 5 mots a ajouter a cette liste, en coherence thematique avec les mots deja presents et l'historique.
Pour chaque mot, donne: mot en francais, traduction en ${languageNames[targetLanguage]}, prononciation, definition courte.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        suggestions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    original: { type: "string" },
                                    translation: { type: "string" },
                                    pronunciation: { type: "string" },
                                    definition: { type: "string" },
                                }
                            }
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Word suggestion error:", err);
            toast.error("Impossible de suggerer des mots. Verifiez votre cle API.");
            setSuggestingWords(false);
            return;
        }

        // Add all suggested words to the list
        const newWords = (result?.suggestions || []).filter(s =>
            !(list.words || []).some(w => w.original === s.original)
        );
        if (newWords.length) {
            await updateListMutation.mutateAsync({ id: list.id, data: { words: [...(list.words || []), ...newWords] } });
            toast.success(`${newWords.length} mot(s) suggere(s) ajoute(s) !`);
        } else {
            toast.info("Aucun nouveau mot suggere.");
        }
        setSuggestingWords(false);
    };

    const colorConfig = (hex) => COLORS.find(c => c.hex === hex) || COLORS[0];
    const { speak, speakingKey } = useSpeech();

    if (selectedList) {
        const cc = colorConfig(selectedList.color);
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedListId(null)} className="text-slate-500 dark:text-slate-400">← Retour</Button>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{selectedList.name}</h3>
                    <Badge className={`${cc.bg} ${cc.text} border-0`}>{(selectedList.words || []).length} mots</Badge>
                </div>

                <div className="flex gap-2">
                <ExportToSheetsButton
                    sheetName="Vocabulaire"
                    label="Exporter la liste"
                    rows={[
                        ['Mot (FR)', 'Traduction', 'Prononciation', 'Définition'],
                        ...(selectedList.words || []).map(w => [w.original, w.translation, w.pronunciation || '', w.definition || ''])
                    ]}
                    disabled={(selectedList.words || []).length === 0}
                />
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSuggestWords(selectedList)}
                    disabled={suggestingWords}
                    className="w-full border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                >
                    {suggestingWords ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Suggérer des mots avec l'IA
                </Button>

                {/* Words in list */}
                <div className="space-y-2">
                    <AnimatePresence>
                        {(selectedList.words || []).length === 0 && (
                            <p className="text-center text-slate-400 dark:text-slate-500 py-6 text-sm">Aucun mot. Ajoutez-en depuis l'historique ci-dessous.</p>
                        )}
                        {(selectedList.words || []).map((word, i) => (
                            <motion.div key={word.original} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                                <Card className={`border ${cc.border} ${cc.bg} shadow-sm`}>
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{word.original}</span>
                                            <span className="mx-2 text-slate-400">→</span>
                                            <span className={`${cc.text} font-medium`} dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>{word.translation}</span>
                                            <SpeakButton text={word.translation} lang="fa" speakFn={speak} activeKey={speakingKey} itemKey={`vocab-${word.original}`} size="sm" />
                                            {word.pronunciation && <span className="ml-2 text-xs text-slate-500">({word.pronunciation})</span>}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleRemoveWord(selectedList, word.original)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Add from history */}
                {translations.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ajouter depuis l'historique</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {translations.slice(0, 20).map(t => (
                                <button key={t.id || t.original_word} onClick={() => handleAddWord(selectedList, t)}
                                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-colors group">
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{t.original_word}</span>
                                    <Plus className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookMarked className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">Mes listes de vocabulaire</h3>
                </div>
                <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Créer
                </Button>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <Card className="border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-900/20">
                            <CardContent className="p-4 space-y-3">
                                <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Nom de la liste..." className="bg-white dark:bg-secondary" onKeyDown={e => e.key === 'Enter' && handleCreateList()} />
                                <div className="flex gap-2">
                                    {COLORS.map(c => (
                                        <button key={c.hex} onClick={() => setNewListColor(c.hex)}
                                            className={`w-7 h-7 rounded-full ${c.bg} border-2 transition-all ${newListColor === c.hex ? 'border-slate-600 scale-110' : 'border-transparent'}`} />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleCreateList} disabled={!newListName.trim() || createListMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
                                        {createListMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {lists.length === 0 && !showCreate && (
                <div className="text-center py-10 text-slate-400">
                    <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Aucune liste. Créez votre première liste de vocabulaire !</p>
                </div>
            )}

            <div className="grid gap-3">
                {lists.map(list => {
                    const cc = colorConfig(list.color);
                    return (
                        <motion.div key={list.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Card className={`border ${cc.border} cursor-pointer hover:shadow-md transition-all`} onClick={() => setSelectedListId(list.id)}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${cc.bg}`}>
                                            <BookMarked className={`h-5 w-5 ${cc.text}`} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-100">{list.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{(list.words || []).length} mot(s)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={e => { e.stopPropagation(); deleteListMutation.mutate(list.id); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <ChevronRight className="h-5 w-5 text-slate-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}