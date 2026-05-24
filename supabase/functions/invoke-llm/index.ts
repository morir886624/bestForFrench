import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LANG_CODES: Record<string, string> = {
  "Français": "fr", "Persan": "fa", "Anglais": "en", "Arabe": "ar",
  "Espagnol": "es", "Allemand": "de", "Italien": "it", "Portugais": "pt",
  "Turc": "tr", "Russe": "ru", "Chinois": "zh", "Japonais": "ja",
  "Coréen": "ko", "Hindi": "hi", "fr": "fr", "fa": "fa", "en": "en",
  "ar": "ar", "es": "es", "de": "de", "it": "it", "pt": "pt",
  "tr": "tr", "ru": "ru", "zh": "zh", "ja": "ja", "ko": "ko", "hi": "hi"
};

function extractLangCode(langName: string): string {
  return LANG_CODES[langName] || langName.split(" ").pop()?.toLowerCase() || "en";
}

async function freeTranslate(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const src = extractLangCode(sourceLang);
  const tgt = extractLangCode(targetLang);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseData?.translatedText) {
    let translation = data.responseData.translatedText;
    if (translation.toUpperCase() === text.toUpperCase() && data.matches?.length > 1) {
      translation = data.matches[1].translation || translation;
    }
    return translation;
  }
  throw new Error("Traduction non disponible");
}

async function openaiCall(apiKey: string, prompt: string, schema: any): Promise<any> {
  const models = ["gpt-4o-mini", "gpt-3.5-turbo"];
  let lastError = "";

  for (const model of models) {
    const systemPrompt = schema
      ? `Tu es un assistant utile qui repond toujours en JSON valide selon le schema fourni. Reponds UNIQUEMENT avec le JSON, sans texte additionnel.\n\nSchema de reponse:\n${JSON.stringify(schema, null, 2)}`
      : "Tu es un assistant utile.";

    const body: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    if (schema) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Reponse vide");
      try {
        return JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
        throw new Error("JSON parse error");
      }
    }

    const errData = await res.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `Error ${res.status}`;

    if (res.status === 401) throw new Error("Cle API OpenAI invalide.");
    if (res.status === 403) throw new Error("Compte OpenAI sans credits. Ajoutez un moyen de paiement sur platform.openai.com/account/billing");
    lastError = errMsg;
    continue;
  }
  throw new Error(lastError || "OpenAI: tous les modeles ont echoue.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, response_json_schema, api_key, mode, source_lang, target_lang, text } = await req.json();

    // MODE: "translate" — free translation via MyMemory (no API key needed)
    if (mode === "translate") {
      if (!text || !source_lang || !target_lang) {
        return new Response(
          JSON.stringify({ error: "text, source_lang, target_lang requis pour le mode translate" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const translation = await freeTranslate(text, source_lang, target_lang);
        return new Response(
          JSON.stringify({ translation }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        // If free translation fails and we have an API key, try OpenAI
        if (api_key) {
          try {
            const result = await openaiCall(api_key, prompt || `Traduis "${text}" du ${source_lang} vers le ${target_lang}. Reponds UNIQUEMENT avec la traduction.`, { type: "object", properties: { translation: { type: "string" } } });
            return new Response(
              JSON.stringify(result),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (openaiErr) {
            return new Response(
              JSON.stringify({ error: openaiErr.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        return new Response(
          JSON.stringify({ error: err.message || "Traduction echouee" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // MODE: "llm" — OpenAI-powered features (vocab, grammar, quiz, etc.)
    if (mode === "llm") {
      if (!api_key) {
        return new Response(
          JSON.stringify({ error: "Cle API requise pour cette fonctionnalite. Allez dans Parametres pour ajouter votre cle OpenAI." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "Prompt requis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const result = await openaiCall(api_key, prompt, response_json_schema);
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Legacy mode (backward compat) — if api_key provided, use OpenAI; otherwise try free translate
    if (api_key && prompt) {
      try {
        const result = await openaiCall(api_key, prompt, response_json_schema);
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!api_key && !prompt) {
      return new Response(
        JSON.stringify({ error: "Cle API non configuree. Allez dans Parametres > Cle API." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Requete invalide" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur interne." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
