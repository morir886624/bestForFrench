/**
 * LLM Service - translations work WITHOUT API key (free API).
 * Advanced features (vocab generation, grammar, quiz) require OpenAI key.
 */

const getApiKey = () => localStorage.getItem('app_api_key') || '';
const getEdgeUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-llm`;
const getAnonKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY;

const edgeHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAnonKey()}`,
  'Apikey': getAnonKey(),
});

/**
 * Free translation — works WITHOUT API key
 */
export async function translateText(text, sourceLang, targetLang) {
  const apiKey = getApiKey();

  try {
    const response = await fetch(getEdgeUrl(), {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({
        mode: 'translate',
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        api_key: apiKey || undefined,
        prompt: `Traduis "${text}" du ${sourceLang} vers le ${targetLang}. Reponds UNIQUEMENT avec la traduction.`,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Erreur de traduction');
    }
    return data.translation || '';
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Erreur reseau. Verifiez votre connexion.');
    }
    throw error;
  }
}

/**
 * OpenAI-powered LLM call — requires API key
 */
export async function invokeLLM(prompt, schema) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Cle API requise pour cette fonctionnalite. Ajoutez votre cle OpenAI dans Parametres.');
  }

  try {
    const response = await fetch(getEdgeUrl(), {
      method: 'POST',
      headers: edgeHeaders(),
      body: JSON.stringify({
        mode: 'llm',
        prompt,
        response_json_schema: schema,
        api_key: apiKey,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Erreur serveur');
    }
    return data;
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Erreur reseau. Verifiez votre connexion.');
    }
    throw error;
  }
}

/**
 * Translation with details — free translation + optional AI details
 */
export async function getTranslationWithDetails(text, sourceLang, targetLang) {
  const apiKey = getApiKey();

  // Always get the free translation first
  const translation = await translateText(text, sourceLang, targetLang);

  if (!apiKey) {
    // No API key — return translation without pronunciation/definition
    return {
      translation,
      pronunciation: '',
      definition: '',
    };
  }

  // Has API key — get pronunciation + definition from OpenAI
  try {
    const details = await invokeLLM(
      `Pour le mot/phrase "${text}" en ${sourceLang}, dont la traduction en ${targetLang} est "${translation}":
1. Donne la prononciation/translitteration de la traduction
2. Donne une courte definition en francais`,
      {
        type: 'object',
        properties: {
          pronunciation: { type: 'string' },
          definition: { type: 'string' }
        }
      }
    );
    return {
      translation,
      pronunciation: details?.pronunciation || '',
      definition: details?.definition || '',
    };
  } catch {
    // OpenAI failed — still return the translation
    return { translation, pronunciation: '', definition: '' };
  }
}

export async function generateVocabWords(level, targetLang, count = 10) {
  return invokeLLM(
    `Genere exactement ${count} mots francais de niveau ${level} avec pour chacun:
- le mot francais
- sa definition simple en francais (1 phrase)
- une phrase d'exemple en francais
- la traduction du mot en ${targetLang}
- la traduction de la phrase d'exemple en ${targetLang}
- la prononciation/translitteration du mot traduit`,
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
            }
          }
        }
      }
    }
  );
}

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
              examples: { type: 'array', items: { type: 'object', properties: { fr: { type: 'string' }, fa: { type: 'string' } } } },
              tip: { type: 'string' },
              tip_fa: { type: 'string' }
            }
          }
        }
      }
    }
  );
}

export async function generateWordPairs(level, count = 10) {
  return invokeLLM(
    `Genere exactement ${count} paires de mots francais-persan de niveau ${level}.`,
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
            }
          }
        }
      }
    }
  );
}
