const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 20000;

function providerError(code, message, statusCode = 502) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export function getLLMConfig(env = process.env) {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) {
    throw providerError(
      "LLM_NOT_CONFIGURED",
      "The language model provider is not configured",
      503
    );
  }

  const timeoutValue = Number(env.LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isInteger(timeoutValue) && timeoutValue >= 1000 && timeoutValue <= 120000
    ? timeoutValue
    : DEFAULT_TIMEOUT_MS;

  return {
    apiKey,
    model: env.LLM_MODEL?.trim() || DEFAULT_MODEL,
    apiUrl: env.LLM_API_URL?.trim() || DEFAULT_API_URL,
    timeoutMs
  };
}

export async function requestChatCompletion({
  messages,
  tools,
  env = process.env,
  fetchImpl = fetch
}) {
  const config = getLLMConfig(env);
  let response;

  try {
    response = await fetchImpl(config.apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(config.timeoutMs)
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw providerError("LLM_TIMEOUT", "The language model request timed out", 504);
    }
    throw providerError("LLM_UNAVAILABLE", "The language model provider could not be reached", 502);
  }

  if (!response || typeof response.ok !== "boolean") {
    throw providerError("LLM_MALFORMED_RESPONSE", "The language model provider returned an invalid response", 502);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw providerError("LLM_RATE_LIMITED", "The language model provider rate limit was reached", 429);
    }
    if (response.status === 401 || response.status === 403) {
      throw providerError("LLM_CONFIGURATION_ERROR", "The language model provider rejected the configured credentials", 503);
    }
    throw providerError("LLM_PROVIDER_ERROR", "The language model provider request failed", 502);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw providerError("LLM_MALFORMED_RESPONSE", "The language model provider returned invalid JSON", 502);
  }

  const message = payload?.choices?.[0]?.message;
  if (
    !message ||
    (message.content !== null && message.content !== undefined && typeof message.content !== "string") ||
    (message.tool_calls !== undefined && !Array.isArray(message.tool_calls))
  ) {
    throw providerError("LLM_MALFORMED_RESPONSE", "The language model provider returned an invalid completion", 502);
  }

  if (!message.content && !message.tool_calls?.length) {
    throw providerError("LLM_MALFORMED_RESPONSE", "The language model provider returned an empty completion", 502);
  }

  if (message.tool_calls?.some((call) =>
    !call ||
    typeof call.id !== "string" ||
    !call.id.trim() ||
    call.type !== "function" ||
    typeof call.function?.name !== "string" ||
    !call.function.name.trim() ||
    typeof call.function.arguments !== "string"
  )) {
    throw providerError("LLM_MALFORMED_RESPONSE", "The language model provider returned an invalid tool call", 502);
  }

  return message;
}
