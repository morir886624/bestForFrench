import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";
import { toast } from "sonner";
import { SHEETS_SCRIPT_URL_KEY } from "@/lib/googleSheets";

export default function GoogleSheetsSettings() {
    const [scriptUrl, setScriptUrl] = useState('');
    const [savedUrl, setSavedUrl] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const v = localStorage.getItem(SHEETS_SCRIPT_URL_KEY) || '';
        setSavedUrl(v);
        setScriptUrl(v);
    }, []);

    const handleSave = () => {
        if (!scriptUrl.trim()) { toast.error("Veuillez entrer l'URL du script."); return; }
        if (scriptUrl.includes('/dev')) {
            toast.error("⚠️ Utilisez l'URL /exec (pas /dev). L'URL /dev ne fonctionne pas sans authentification !");
            return;
        }
        localStorage.setItem(SHEETS_SCRIPT_URL_KEY, scriptUrl.trim());
        setSavedUrl(scriptUrl.trim());
        setSaved(true);
        toast.success("Connexion Google Sheets enregistrée !");
        setTimeout(() => setSaved(false), 2000);
    };

    const handleClear = () => {
        localStorage.removeItem(SHEETS_SCRIPT_URL_KEY);
        setSavedUrl('');
        setScriptUrl('');
        toast.info("Connexion Google Sheets supprimée.");
    };

    const isConfigured = !!savedUrl;

    return (
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-card backdrop-blur-sm">
            <CardContent className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                        <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Google Sheets</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Exporter vocabulaire, traductions et grammaire</p>
                    </div>
                    {isConfigured && <Badge className="ml-auto bg-green-100 text-green-700 border-0">✓ Configuré</Badge>}
                </div>

                {/* Configured display */}
                {isConfigured && (
                    <div className="bg-slate-50 dark:bg-secondary rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500">URL du script</p>
                            <code className="text-xs text-slate-700 dark:text-slate-300 font-mono">{savedUrl.slice(0, 40)}...</code>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs">
                            Supprimer
                        </Button>
                    </div>
                )}

                {/* Script URL Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">URL du Google Apps Script</label>
                    <Input
                        value={scriptUrl}
                        onChange={e => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="font-mono text-sm bg-white dark:bg-secondary border-slate-200"
                    />
                </div>

                <Button
                    onClick={handleSave}
                    disabled={!scriptUrl.trim() || scriptUrl === savedUrl}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                    {saved ? <><Check className="h-4 w-4 mr-2" /> Enregistré !</> : 'Connecter Google Sheets'}
                </Button>

                {/* Info */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-100 dark:border-green-900/40 space-y-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <Info className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-semibold">Comment configurer ?</span>
                    </div>
                    <ol className="text-xs text-green-700 dark:text-green-400 space-y-1 list-decimal list-inside">
                        <li>Ouvrez votre Google Sheet → <strong>Extensions → Apps Script</strong></li>
                        <li>Collez ce code dans l'éditeur :</li>
                    </ol>
                    <pre className="text-xs bg-green-100 dark:bg-green-900/40 rounded-lg p-2 overflow-x-auto text-green-800 dark:text-green-300 whitespace-pre-wrap">{`function doPost(e) {
  if (!e || !e.postData) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "No POST data received" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = JSON.parse(e.postData.contents);
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.sheet)
              || ss.insertSheet(data.sheet);

  data.rows.forEach(function(row) {
    sheet.appendRow(row);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
                    <ol className="text-xs text-green-700 dark:text-green-400 space-y-1 list-decimal list-inside" start={3}>
                        <li>Cliquez <strong>Déployer → Nouveau déploiement</strong></li>
                        <li>Type : <strong>Application Web</strong>, accès : <strong>Tout le monde</strong></li>
                        <li>Copiez l'URL générée et collez-la ci-dessus</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
    );
}