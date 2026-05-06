import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, XCircle, BookOpen, ChevronDown, ChevronUp, FileSpreadsheet, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from "sonner";
import { appendToSheet, isSheetsConfigured } from "@/lib/googleSheets";

function SaveToSheetsBtn({ item, section }) {
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    if (!isSheetsConfigured()) return null;

    const handleSave = async (e) => {
        e.stopPropagation();
        setSaving(true);
        const sheetName = section === 'grammar' ? 'Grammaire' : section === 'quiz' ? 'Quiz' : 'Vocabulaire';
        await appendToSheet(sheetName, [[
            item.word_original,
            item.word_translation,
            item.word_pronunciation || '',
            item.word_definition || '',
            item.topic || '',
            section === 'quiz' ? (item.quiz_result || '') : '',
        ]]);
        setSaving(false);
        setDone(true);
        toast.success("Enregistré dans Google Sheets !");
        setTimeout(() => setDone(false), 3000);
    };

    return (
        <button
            onClick={handleSave}
            disabled={saving || done}
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-all shrink-0 ${
                done
                    ? 'border-green-300 text-green-600 bg-green-50'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 bg-white'
            }`}
        >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? <Check className="h-3 w-3" /> : <FileSpreadsheet className="h-3 w-3" />}
            {done ? 'Sauvegardé' : 'Sheets'}
        </button>
    );
}

export default function SectionHistory({ section, userEmail }) {
    const [open, setOpen] = useState(false);

    const { data: items = [] } = useQuery({
        queryKey: ['session-history', section, userEmail],
        queryFn: () => base44.entities.SessionHistory.filter({ user_email: userEmail, section }, '-created_date', 50),
        enabled: !!userEmail,
    });

    if (items.length === 0) return null;

    const isRTL = (lang) => ['fa', 'ar', 'persan', 'arabe'].includes(lang?.toLowerCase());

    return (
        <div className="mt-4">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 text-slate-600 hover:text-indigo-600 transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="font-semibold text-sm">Historique de révision</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-indigo-100 transition-colors">
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
                        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                            {items.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    <Card className="border-0 shadow-sm bg-white/70">
                                        <CardContent className="p-3 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {section === 'quiz' && (
                                                    item.quiz_result === 'correct'
                                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                                )}
                                                {section === 'vocab' && (
                                                    <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium text-slate-700 truncate block">{item.word_original}</span>
                                                    <span
                                                        className="text-xs text-indigo-600 truncate block"
                                                        dir={isRTL(item.target_language) ? 'rtl' : 'ltr'}
                                                        style={isRTL(item.target_language) ? { fontFamily: 'Vazirmatn, sans-serif' } : {}}
                                                    >
                                                        {item.word_translation}
                                                    </span>
                                                    {item.word_pronunciation && (
                                                        <span className="text-xs text-amber-600">/{item.word_pronunciation}/</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                               {item.topic && (
                                                   <Badge variant="outline" className="text-xs text-slate-400 capitalize">{item.topic}</Badge>
                                               )}
                                               {section === 'quiz' && (
                                                   <Badge className={item.quiz_result === 'correct' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-red-100 text-red-600 border-0 text-xs'}>
                                                       {item.quiz_result === 'correct' ? '✓ Correct' : '✗ Faux'}
                                                   </Badge>
                                               )}
                                               <span className="text-xs text-slate-400">
                                                   {formatDistanceToNow(new Date(item.created_date), { addSuffix: true, locale: fr })}
                                               </span>
                                               <SaveToSheetsBtn item={item} section={section} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}