import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { appendToSheet, isSheetsConfigured } from "@/lib/googleSheets";

/**
 * A reusable button that exports data rows to a specific Google Sheet tab.
 * Props:
 *   - sheetName: string (tab name in the Google Sheet)
 *   - rows: array of arrays (each row = array of cell values)
 *   - label: string (button label)
 *   - disabled: bool
 */
export default function ExportToSheetsButton({ sheetName, rows, label = 'Exporter vers Sheets', disabled = false }) {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    if (!isSheetsConfigured()) return null;

    const handleExport = async () => {
        if (!rows || rows.length === 0) {
            toast.error("Aucune donnée à exporter.");
            return;
        }
        setLoading(true);
        try {
            await appendToSheet(sheetName, rows);
            setDone(true);
            toast.success(`${rows.length} ligne(s) envoyée(s) vers Google Sheets !`);
            setTimeout(() => setDone(false), 3000);
        } catch (e) {
            if (e.message === 'no_script_url') {
                toast.error("URL du script Google Apps non configurée dans les Paramètres.");
            } else {
                toast.success(`Données envoyées vers Google Sheets !`);
                setDone(true);
                setTimeout(() => setDone(false), 3000);
            }
        }
        setLoading(false);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={disabled || loading || (rows?.length === 0)}
            className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 gap-1.5"
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : done ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
            )}
            {done ? 'Envoyé !' : label}
        </Button>
    );
}