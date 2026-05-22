// Re-export the new Supabase-based API for backward compatibility
import { api, supabase } from './supabaseApi';
export { supabase };

// For backward compatibility with base44 SDK pattern
export const base44 = {
  auth: api.auth,
  entities: api.entities,
  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        const { invokeLLM } = await import('./llmService');
        const result = await invokeLLM(params.prompt, params.response_json_schema);
        return result;
      }
    }
  }
};

export default base44;
