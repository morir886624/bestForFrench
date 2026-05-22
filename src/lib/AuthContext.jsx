import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkAuthState();

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
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

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
      console.error('Auth state check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  };

  const getOrCreateProfile = async (authUser) => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
        return;
      }

      if (existingProfile) {
        setProfile(existingProfile);
      } else {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.id,
            email: authUser.email,
            display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || ''
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          setProfile(newProfile);
        }
      }
    } catch (err) {
      console.error('Profile creation error:', err);
    }
  };

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName
        }
      }
    });

    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
