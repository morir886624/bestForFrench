import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const REMINDERS_KEY = 'daily_reminders';

function getReminders() {
    try {
        return JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]');
    } catch { return []; }
}

export default function DailyReminder() {
    const [reminders, setReminders] = useState(getReminders);
    const [newTime, setNewTime] = useState('09:00');
    const [permissionGranted, setPermissionGranted] = useState(false);

    useEffect(() => {
        setPermissionGranted(Notification.permission === 'granted');
    }, []);

    // Check every 30s if any reminder should fire
    useEffect(() => {
        if (!permissionGranted) return;
        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const today = now.toDateString();
            const stored = getReminders();
            stored.forEach(r => {
                if (!r.enabled) return;
                const lastKey = `last_notif_${r.id}`;
                if (r.time === currentTime && localStorage.getItem(lastKey) !== today) {
                    localStorage.setItem(lastKey, today);
                    new Notification('🇫🇷 Rappel d\'apprentissage !', {
                        body: `C'est l'heure de votre session ! (${r.time})`,
                        icon: '/icon-192x192.png',
                    });
                }
            });
        }, 30000);
        return () => clearInterval(interval);
    }, [permissionGranted]);

    const requestPermission = async () => {
        const permission = await Notification.requestPermission();
        setPermissionGranted(permission === 'granted');
        return permission === 'granted';
    };

    const save = (updated) => {
        setReminders(updated);
        localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
    };

    const handleAdd = async () => {
        let granted = permissionGranted;
        if (!granted) granted = await requestPermission();
        if (!granted) { toast.error("Autorisez les notifications pour activer les rappels."); return; }
        const exists = reminders.find(r => r.time === newTime);
        if (exists) { toast.error("Un rappel existe déjà à cette heure."); return; }
        const updated = [...reminders, { id: Date.now(), time: newTime, enabled: true }];
        save(updated);
        toast.success(`Rappel ajouté à ${newTime} !`);
    };

    const handleToggle = (id) => {
        const updated = reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
        save(updated);
    };

    const handleDelete = (id) => {
        const updated = reminders.filter(r => r.id !== id);
        save(updated);
        toast.info("Rappel supprimé.");
    };

    const activeCount = reminders.filter(r => r.enabled).length;

    return (
        <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${activeCount > 0 ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                        {activeCount > 0
                            ? <Bell className="h-4 w-4 text-indigo-600" />
                            : <BellOff className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Rappels quotidiens</p>
                        <p className="text-xs text-slate-400">
                            {activeCount > 0 ? `${activeCount} rappel${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}` : 'Aucun rappel configuré'}
                        </p>
                    </div>
                </div>

                {/* Add reminder row */}
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
                    <input
                        type="time"
                        value={newTime}
                        onChange={e => setNewTime(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                        <Plus className="h-4 w-4 mr-1" /> Ajouter
                    </Button>
                </div>

                {/* Reminder list */}
                <AnimatePresence initial={false}>
                    {reminders.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                            {reminders.sort((a, b) => a.time.localeCompare(b.time)).map(r => (
                                <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                                        r.enabled ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60'
                                    }`}
                                >
                                    <button onClick={() => handleToggle(r.id)} className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${r.enabled ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                            {r.enabled && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <span className={`text-sm font-semibold ${r.enabled ? 'text-indigo-700' : 'text-slate-400'}`}>{r.time}</span>
                                    </button>
                                    <button onClick={() => handleDelete(r.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {reminders.length === 0 && (
                    <p className="text-xs text-center text-slate-400 py-1">Ajoutez une heure pour recevoir un rappel chaque jour.</p>
                )}
            </CardContent>
        </Card>
    );
}