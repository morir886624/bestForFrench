import { api, supabase } from './supabaseApi';
import { invokeLLM, translateText, getTranslationWithDetails } from './llmService';

export { supabase };

export const base44 = {
  auth: api.auth,
  entities: api.entities,
  integrations: {
    Core: {
      InvokeLLM: async (params) => invokeLLM(params.prompt, params.response_json_schema),
    }
  },
  // Free translation — works without API key
  translate: translateText,
  // Translation with details (free + optional OpenAI)
  translateWithDetails: getTranslationWithDetails,
};

export default base44;
