import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, User, LogIn, UserPlus } from "lucide-react";

export function AuthModal({ onClose }) {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success("Connecte !");
      } else {
        await signUp(email, password, displayName);
        toast.success("Compte cree ! Verifiez votre email.");
      }
      onClose?.();
    } catch (err) {
      console.error('Auth error:', err);
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">
                {isLogin ? 'Connexion' : 'Creer un compte'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isLogin
                  ? 'Connectez-vous pour sauvegarder vos donnees'
                  : 'Creez votre compte pour commencer'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Votre nom"
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Chargement...
                  </span>
                ) : isLogin ? (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Creer un compte
                  </span>
                )}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {isLogin
                  ? "Pas de compte ? S'inscrire"
                  : 'Deja un compte ? Se connecter'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Continuer sans connexion
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
