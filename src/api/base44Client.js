import { api, supabase } from './supabaseApi';
import { invokeLLM } from './llmService';

export { supabase };

// For backward compatibility with base44 SDK pattern
export const base44 = {
  auth: api.auth,
  entities: api.entities,
  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        return invokeLLM(params.prompt, params.response_json_schema);
      }
    }
  }
};

export default base44;
