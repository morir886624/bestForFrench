/**
 * LLM Service for translations and AI-generated content
 * Routes through Supabase Edge Function to avoid CORS issues with OpenAI
 */

const getApiKey = () => {
  return localStorage.getItem('app_api_key') || '';
};

const getEdgeFunctionUrl = () => {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-llm`;
};

const getAnonKey = () => {
  return import.meta.env.VITE_SUPABASE_ANON_KEY;
};

/**
 * Call LLM via Supabase Edge Function (proxies to OpenAI)
 * @param {string} prompt - The prompt to send
 * @param {Object} schema - JSON schema for response
 * @returns {Promise<Object|null>}
 */
export async function invokeLLM(prompt, schema) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Cle API non configuree. Veuillez ajouter votre cle API OpenAI dans les parametres de votre profil.');
  }

  try {
    const response = await fetch(getEdgeFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAnonKey()}`,
        'Apikey': getAnonKey(),
      },
      body: JSON.stringify({
        prompt,
        response_json_schema: schema,
        api_key: apiKey,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Re-throw with user-friendly message if it's a network error
    if (error.message === 'Failed to fetch') {
      throw new Error('Erreur reseau. Verifiez votre connexion internet.');
    }
    throw error;
  }
}

/**
 * Simple translation function
 */
export async function translateText(text, sourceLang, targetLang) {
  const result = await invokeLLM(
    `Traduis "${text}" du ${sourceLang} vers le ${targetLang}. Reponds UNIQUEMENT avec la traduction.`,
    { type: 'object', properties: { translation: { type: 'string' } } }
  );
  return result?.translation || '';
}

/**
 * Get translation with details (pronunciation, definition)
 */
export async function getTranslationWithDetails(text, sourceLang, targetLang) {
  return invokeLLM(
    `Pour le mot/phrase "${text}" en ${sourceLang}:
1. Donne la traduction en ${targetLang}
2. Donne la prononciation/translitteration
3. Donne une courte definition en francais

Reponds en JSON.`,
    {
      type: 'object',
      properties: {
        translation: { type: 'string' },
        pronunciation: { type: 'string' },
        definition: { type: 'string' }
      },
      required: ['translation', 'pronunciation', 'definition']
    }
  );
}

/**
 * Generate vocabulary words by level
 */
export async function generateVocabWords(level, targetLang, count = 10) {
  return invokeLLM(
    `Genere exactement ${count} mots francais de niveau ${level} avec pour chacun:
- le mot francais
- sa definition simple en francais (1 phrase)
- une phrase d'exemple en francais
- la traduction du mot en ${targetLang}
- la traduction de la phrase d'exemple en ${targetLang}
- la prononciation/translitteration du mot traduit

Assure-toi que les mots sont varies et correspondent bien au niveau ${level}.`,
    {
      type: 'object',
      properties: {
        words: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string' },
              definition: { type: 'string' },
              example_fr: { type: 'string' },
              translation: { type: 'string' },
              example_translated: { type: 'string' },
              pronunciation: { type: 'string' }
            },
            required: ['word', 'definition', 'example_fr', 'translation', 'example_translated', 'pronunciation']
          }
        }
      },
      required: ['words']
    }
  );
}

/**
 * Generate grammar lessons
 */
export async function generateGrammarLessons(level, count = 5) {
  return invokeLLM(
    `Genere ${count} fiches de grammaire francaise de niveau ${level} pour un apprenant persanophone.
Chaque fiche doit contenir:
1. Le point de grammaire en francais
2. La traduction persane du titre
3. Une explication claire en francais
4. La meme explication traduite en persan
5. La regle principale en francais
6. La meme regle traduite en persan
7. 2 exemples en francais avec leur traduction persane
8. Un point d'attention en francais
9. Ce point traduit en persan`,
    {
      type: 'object',
      properties: {
        lessons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              title_fa: { type: 'string' },
              explanation: { type: 'string' },
              explanation_fa: { type: 'string' },
              rule: { type: 'string' },
              rule_fa: { type: 'string' },
              examples: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fr: { type: 'string' },
                    fa: { type: 'string' }
                  }
                }
              },
              tip: { type: 'string' },
              tip_fa: { type: 'string' }
            },
            required: ['title', 'title_fa', 'explanation', 'explanation_fa', 'rule', 'rule_fa', 'examples', 'tip', 'tip_fa']
          }
        }
      },
      required: ['lessons']
    }
  );
}

/**
 * Generate word pairs for exercises
 */
export async function generateWordPairs(level, count = 10) {
  return invokeLLM(
    `Genere exactement ${count} paires de mots francais-persan de niveau ${level}.
Chaque paire doit avoir:
- un mot francais
- sa traduction en persan (script persan)
- sa translitteration/prononciation`,
    {
      type: 'object',
      properties: {
        pairs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fr: { type: 'string' },
              fa: { type: 'string' },
              pronunciation: { type: 'string' }
            },
            required: ['fr', 'fa']
          }
        }
      },
      required: ['pairs']
    }
  );
}
