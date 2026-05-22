/**
 * LLM Service for translations and AI-generated content
 * Uses OpenAI API directly via user-provided API key
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const getApiKey = () => {
  return localStorage.getItem('app_api_key') || '';
};

/**
 * Call OpenAI API with structured output
 * @param {string} prompt - The prompt to send
 * @param {Object} schema - JSON schema for response
 * @returns {Promise<Object|null>}
 */
export async function invokeLLM(prompt, schema) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Clé API non configurée. Veuillez ajouter votre clé API OpenAI dans les paramètres.');
  }

  const systemPrompt = schema
    ? `Tu es un assistant utile qui répond toujours en JSON valide selon le schema fourni. Réponds UNIQUEMENT avec le JSON, sans texte additionnel.

Schema de réponse:
${JSON.stringify(schema, null, 2)}`
    : 'Tu es un assistant utile.';

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Clé API invalide. Vérifiez votre clé OpenAI.');
      }
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte. Réessayez dans quelques instants.');
      }
      throw new Error(errorData.error?.message || `Erreur API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Réponse vide de l\'API');
    }

    // Parse JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Impossible de parser la réponse JSON');
    }
  } catch (error) {
    console.error('LLM invocation error:', error);
    throw error;
  }
}

/**
 * Simple translation function
 */
export async function translateText(text, sourceLang, targetLang) {
  const result = await invokeLLM(
    `Traduis "${text}" du ${sourceLang} vers le ${targetLang}. Réponds UNIQUEMENT avec la traduction.`,
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
2. Donne la prononciation/translittération
3. Donne une courte définition en français

Réponds en JSON.`,
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
    `Génère exactement ${count} mots français de niveau ${level} avec pour chacun:
- le mot français
- sa définition simple en français (1 phrase)
- une phrase d'exemple en français
- la traduction du mot en ${targetLang}
- la traduction de la phrase d'exemple en ${targetLang}
- la prononciation/translittération du mot traduit

Assure-toi que les mots sont variés et correspondent bien au niveau ${level}.`,
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
    `Génère ${count} fiches de grammaire française de niveau ${level} pour un apprenant persanophone.
Chaque fiche doit contenir:
1. Le point de grammaire en français
2. La traduction persane du titre
3. Une explication claire en français
4. La même explication traduite en persan
5. La règle principale en français
6. La même règle traduite en persan
7. 2 exemples en français avec leur traduction persane
8. Un point d'attention en français
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
    `Génère exactement ${count} paires de mots français-persan de niveau ${level}.
Chaque paire doit avoir:
- un mot français
- sa traduction en persan (script persan)
- sa translittération/prononciation`,
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
