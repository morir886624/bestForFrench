import { supabase } from '@/lib/supabase';

// Helper to get current user
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Translation API
export const translationApi = {
  list: async (order = 'created_at', limit = 100) => {
    const user = await getCurrentUser();
    if (!user) return [];

    const { column, ascending } = order.startsWith('-')
      ? { column: order.slice(1), ascending: false }
      : { column: order, ascending: true };

    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('user_id', user.id)
      .order(column, { ascending })
      .limit(limit);

    if (error) {
      console.error('Error fetching translations:', error);
      return [];
    }
    return data || [];
  },

  create: async (translationData) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('translations')
      .insert({
        user_id: user.id,
        ...translationData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('translations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }
};

// Vocab List API
export const vocabListApi = {
  list: async (order = 'created_at') => {
    const user = await getCurrentUser();
    if (!user) return [];

    const { column, ascending } = order.startsWith('-')
      ? { column: order.slice(1), ascending: false }
      : { column: order, ascending: true };

    const { data, error } = await supabase
      .from('vocab_lists')
      .select('*')
      .eq('user_id', user.id)
      .order(column, { ascending });

    if (error) {
      console.error('Error fetching vocab lists:', error);
      return [];
    }
    return data || [];
  },

  create: async (listData) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vocab_lists')
      .insert({
        user_id: user.id,
        ...listData
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id, updateData) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vocab_lists')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('vocab_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }
};

// User Progress API
export const userProgressApi = {
  get: async () => {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching progress:', error);
      return null;
    }
    return data;
  },

  update: async (updateData) => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('user_progress')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          ...updateData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }
};

// Session History API
export const sessionHistoryApi = {
  list: async (section = null, limit = 50) => {
    const user = await getCurrentUser();
    if (!user) return [];

    let query = supabase
      .from('session_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (section) {
      query = query.eq('section', section);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
    return data || [];
  },

  create: async (historyData) => {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('session_history')
      .insert({
        user_id: user.id,
        email: user.email,
        ...historyData
      });

    if (error) console.error('Error creating session history:', error);
  },

  deleteByUser: async () => {
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('session_history')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  }
};

// Auth API wrapper for backward compatibility
export const authApi = {
  me: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
    } : null;
  },
  logout: async () => {
    await supabase.auth.signOut();
  }
};

// API object for backward compatibility with base44 entities pattern
export const api = {
  auth: authApi,
  entities: {
    Translation: {
      list: translationApi.list,
      create: translationApi.create,
      delete: translationApi.delete,
      filter: async (filters) => {
        const user = await getCurrentUser();
        if (!user) return [];

        let query = supabase.from('translations').select('*').eq('user_id', user.id);

        for (const [key, value] of Object.entries(filters || {})) {
          query = query.eq(key, value);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error filtering translations:', error);
          return [];
        }
        return data || [];
      }
    },
    VocabList: {
      list: vocabListApi.list,
      create: vocabListApi.create,
      update: async (id, data) => vocabListApi.update(id, data),
      delete: vocabListApi.delete
    },
    UserProgress: {
      filter: async (filters) => {
        const user = await getCurrentUser();
        if (!user) return [];

        let query = supabase.from('user_progress').select('*').eq('user_id', user.id);

        const { data, error } = await query.maybeSingle();
        if (error) {
          console.error('Error fetching user progress:', error);
          return [];
        }
        return data ? [data] : [];
      },
      create: async (data) => {
        const result = await userProgressApi.update(data);
        return result;
      },
      update: async (id, data) => {
        return userProgressApi.update(data);
      },
      delete: async (id) => {
        const user = await getCurrentUser();
        if (!user) return;

        const { error } = await supabase
          .from('user_progress')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    },
    SessionHistory: {
      filter: async (filters) => {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('session_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('email', filters?.user_email || user.email)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching session history:', error);
          return [];
        }
        return data || [];
      },
      create: sessionHistoryApi.create
    }
  }
};

export { supabase };
