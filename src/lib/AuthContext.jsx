import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAuthState();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        if (session?.user) {
          getOrCreateProfile(session.user);
        } else {
          setProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      console.warn('Auth state listener setup failed:', err);
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await getOrCreateProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setProfile(null);
      }
    } catch (error) {
      console.warn('Auth check failed (running in guest mode):', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const getOrCreateProfile = async (authUser) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.id,
            email: authUser.email,
            display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || ''
          })
          .select()
          .single();

        if (newProfile) {
          setProfile(newProfile);
        }
      }
    } catch (err) {
      console.warn('Profile creation error:', err);
    }
  };

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setIsAuthenticated(false);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      signUp,
      signIn,
      signOut,
      checkAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
