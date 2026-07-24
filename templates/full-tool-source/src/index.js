const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function extractText(content) {
  if (!Array.isArray(content)) return "";
  return content.map((block) => block && block.text ? block.text : "").join("");
}

async function handleGenerate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "Prompt is required." }, 400);
  if (prompt.length > 12000) return json({ error: "Prompt is too long." }, 413);

  const apiKey = request.headers.get("x-anthropic-api-key") || "";
  if (!apiKey) return json({ error: "Anthropic API key is required." }, 401);

  const anthropicResponse = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await anthropicResponse.json().catch(() => ({}));
  if (!anthropicResponse.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : `Anthropic request failed with ${anthropicResponse.status}.`;
    return json({ error: message }, anthropicResponse.status);
  }

  return json({ text: extractText(data.content) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405);
      }
      return handleGenerate(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

