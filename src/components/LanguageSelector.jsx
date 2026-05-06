import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, ChevronDown, Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'fa', name: 'فارسی' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ar', name: 'العربية' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
];

function MobileLanguagePicker({ value, onChange, label }) {
    const [open, setOpen] = useState(false);
    const selected = languages.find(l => l.code === value);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex-1 h-12 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-3 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
            >
                <span className="text-base font-medium text-slate-800 truncate">
                    {selected?.name ?? label}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
            </button>
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>{label}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-8 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => { onChange(lang.code); setOpen(false); }}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                                    value === lang.code
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="text-base">{lang.name}</span>
                                {value === lang.code && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                            </button>
                        ))}
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}

export default function LanguageSelector({ sourceLanguage, targetLanguage, onSourceChange, onTargetChange, onSwap }) {
    return (
        <div className="flex items-center gap-2">
            <MobileLanguagePicker value={sourceLanguage} onChange={onSourceChange} label="Langue source" />
            <Button
                variant="outline"
                size="icon"
                onClick={onSwap}
                className="h-12 w-12 rounded-xl border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all shrink-0"
            >
                <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
            </Button>
            <MobileLanguagePicker value={targetLanguage} onChange={onTargetChange} label="Langue cible" />
        </div>
    );
}