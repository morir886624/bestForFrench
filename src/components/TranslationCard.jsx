import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSpeech } from "@/hooks/useSpeech";
import SpeakButton from "@/components/SpeakButton";

export default function TranslationCard({ translation, showDate = false }) {
    const [copied, setCopied] = React.useState(false);
    const { speak, speakingKey } = useSpeech();

    const handleCopy = () => {
        navigator.clipboard.writeText(translation.persian_translation);
        setCopied(true);
        toast.success("Copié !");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="group bg-white/80 dark:bg-card backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex gap-2 mb-2">
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-0">
                                {translation.source_language}
                            </Badge>
                            {translation.target_language && (
                                <>
                                    <span className="text-slate-400">→</span>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0">
                                        {translation.target_language}
                                    </Badge>
                                </>
                            )}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                            {translation.original_word}
                        </h3>
                    </div>
                    <div className="flex gap-1">
                        <SpeakButton
                            text={translation.persian_translation}
                            lang={translation.target_language || 'fa'}
                            speakFn={speak}
                            activeKey={speakingKey}
                            itemKey={`card-${translation.original_word}`}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-900/40">
                        <p className="text-2xl font-medium text-slate-800 dark:text-slate-100 text-right" dir="rtl" style={{ fontFamily: 'Vazirmatn, sans-serif' }}>
                            {translation.persian_translation}
                        </p>
                        {translation.pronunciation && (
                            <p className="text-sm text-amber-700 mt-2 text-right" dir="rtl">
                                {translation.pronunciation}
                            </p>
                        )}
                    </div>

                    {translation.definition && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {translation.definition}
                            </p>
                        </div>
                    )}

                    {showDate && translation.created_date && (
                        <p className="text-xs text-slate-400 pt-2">
                            {new Date(translation.created_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}