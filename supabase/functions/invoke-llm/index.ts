import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODELS = ["gpt-4o-mini", "gpt-3.5-turbo"];

async function tryOpenAI(apiKey: string, prompt: string, response_json_schema: any): Promise<Response> {
  let lastError: any = null;

  for (const model of MODELS) {
    const systemPrompt = response_json_schema
      ? `Tu es un assistant utile qui repond toujours en JSON valide selon le schema fourni. Reponds UNIQUEMENT avec le JSON, sans texte additionnel.\n\nSchema de reponse:\n${JSON.stringify(response_json_schema, null, 2)}`
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

    // Use response_format for models that support it
    if (response_json_schema && (model === "gpt-4o-mini" || model.startsWith("gpt-4"))) {
      body.response_format = { type: "json_object" };
    }

    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (openaiResponse.ok) {
        const data = await openaiResponse.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          return new Response(
            JSON.stringify({ error: "Reponse vide de l'API" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Parse JSON response
        let parsedResult: any;
        try {
          parsedResult = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
          } else {
            return new Response(
              JSON.stringify({ error: "Impossible de parser la reponse JSON de l'API" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify(parsedResult),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle specific errors
      const errorData = await openaiResponse.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `OpenAI API error: ${openaiResponse.status}`;

      // Don't retry on auth errors - the key is invalid for all models
      if (openaiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Cle API OpenAI invalide. Verifiez que vous avez copie la bonne cle (elle commence par sk-)." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Don't retry on insufficient quota - account has no credits
      if (openaiResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: "Votre compte OpenAI n'a pas de credits. Ajoutez un moyen de paiement sur platform.openai.com/account/billing" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For 429 rate limit, try next model
      if (openaiResponse.status === 429) {
        lastError = "Limite de requetes atteinte. Votre cle API a depasse son quota. Verifiez votre utilisation sur platform.openai.com/account/usage ou attendez quelques minutes.";
        continue;
      }

      // For model not found, try next model
      if (openaiResponse.status === 404 || errorMessage.includes("does not exist") || errorMessage.includes("model_not_found")) {
        lastError = errorMessage;
        continue;
      }

      // Other errors
      lastError = errorMessage;
      continue;
    } catch (fetchError) {
      lastError = fetchError.message || "Network error calling OpenAI";
      continue;
    }
  }

  // All models failed
  return new Response(
    JSON.stringify({ error: lastError || "Tous les modeles ont echoue. Verifiez votre cle API et votre compte OpenAI." }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, response_json_schema, api_key } = body;

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "Cle API non configuree. Allez dans Parametres > Cle API pour ajouter votre cle OpenAI." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await tryOpenAI(api_key, prompt, response_json_schema);
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur serveur interne. Reessayez plus tard." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
