import { z } from "zod";

const configSchema = z.object({
  key: z.string().trim().min(1),
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    }, "Use an HTTPS provider base URL."),
  model: z.string().trim().min(1).max(200),
  protocol: z.enum(["responses", "chat"]),
});
export type TemplateAiConfig = z.infer<typeof configSchema>;
export class TemplatePlanFormatError extends Error {}
export function templateAiConfigured(
  env: Record<string, string | undefined> = process.env
) {
  return Boolean(
    env.AI_API_KEY || env.ORCAROUTER_API_KEY || env.OPENAI_API_KEY
  );
}
export function getTemplateAiConfig(
  env: Record<string, string | undefined> = process.env
): TemplateAiConfig {
  const orca = Boolean(env.ORCAROUTER_API_KEY);
  const custom = Boolean(env.AI_API_KEY || orca);
  return configSchema.parse({
    key: env.AI_API_KEY || env.ORCAROUTER_API_KEY || env.OPENAI_API_KEY,
    baseUrl: (
      env.AI_BASE_URL ||
      (orca ? "https://api.orcarouter.ai/v1" : "https://api.openai.com/v1")
    ).replace(/\/+$/, ""),
    model:
      env.AI_MODEL ||
      env.OPENAI_MODEL ||
      (orca ? "z-ai/glm-5.3-flash-free" : "gpt-4.1-mini"),
    protocol: env.AI_PROTOCOL || (custom ? "chat" : "responses"),
  });
}
export function localStudioAiAllowed(
  host: string | null,
  origin: string | null,
  env: Record<string, string | undefined> = process.env
) {
  if (
    env.NODE_ENV !== "development" ||
    env.AI_ALLOW_LOCAL_STUDIO !== "true" ||
    !host
  )
    return false;
  try {
    const target = new URL(`http://${host}`);
    const local = (hostname: string) =>
      ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    if (!local(target.hostname)) return false;
    if (origin) {
      const source = new URL(origin);
      if (!local(source.hostname) || source.host !== target.host) return false;
    }
    return true;
  } catch {
    return false;
  }
}
export async function requestTemplateJson(
  config: TemplateAiConfig,
  instructions: string,
  input: string,
  schema?: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(60000)
): Promise<unknown> {
  const chat = config.protocol === "chat";
  // Some compatible routers accept response_format without passing its schema
  // to the model. Keep the contract in the model's instructions as well.
  const structuredInstructions =
    schema ?
      `${instructions}\nReturn JSON only. Required JSON schema: ${JSON.stringify(schema)}`
    : instructions;
  const body =
    chat ?
      {
        model: config.model,
        stream: false,
        max_tokens: 8000,
        messages: [
          { role: "system", content: structuredInstructions },
          { role: "user", content: input },
        ],
        response_format:
          schema ?
            {
              type: "json_schema",
              json_schema: {
                name: "productivity_template",
                strict: true,
                schema,
              },
            }
          : { type: "json_object" },
      }
    : {
        model: config.model,
        store: false,
        max_output_tokens: 8000,
        instructions: structuredInstructions,
        input,
        text: {
          format:
            schema ?
              {
                type: "json_schema",
                name: "productivity_template",
                strict: true,
                schema,
              }
            : { type: "json_object" },
        },
      };
  let response: Response;
  try {
    const init = {
      method: "POST",
      cache: "no-store" as const,
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
      },
    };
    response = await fetcher(
      `${config.baseUrl}/${chat ? "chat/completions" : "responses"}`,
      { ...init, body: JSON.stringify(body) }
    );
    if (chat && schema && [400, 422].includes(response.status))
      response = await fetcher(`${config.baseUrl}/chat/completions`, {
        ...init,
        body: JSON.stringify({
          ...body,
          messages: [
            {
              role: "system",
              content: structuredInstructions,
            },
            { role: "user", content: input },
          ],
          response_format: { type: "json_object" },
        }),
      });
  } catch {
    throw new Error(
      "AI generation timed out or could not connect. Your page is unchanged; try the local composer."
    );
  }
  if (!response.ok) {
    if (response.status === 429)
      throw new Error(
        "The AI provider is rate limited. Try again shortly, or use the local composer."
      );
    if ([401, 403].includes(response.status))
      throw new Error(
        "The AI provider rejected the server API key. Update its configuration or use the local composer."
      );
    throw new Error(
      "The AI provider is unavailable. Check its base URL and model configuration, or use the local composer."
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "The AI provider returned invalid JSON. Your page is unchanged."
    );
  }
  const record = payload as {
    status?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
    choices?: {
      finish_reason?: string;
      message?: { content?: string; refusal?: unknown };
    }[];
  };
  let text = "";
  if (!record || typeof record !== "object")
    throw new Error(
      "The AI provider returned an invalid response. Your page is unchanged."
    );
  if (chat) {
    const choice = record.choices?.[0];
    if (choice?.finish_reason !== "stop" || choice.message?.refusal)
      throw new Error(
        "The AI response was incomplete or refused. Try a shorter description."
      );
    text = choice.message?.content ?? "";
  } else {
    if (record.status !== "completed")
      throw new Error(
        "The AI response was incomplete. Try a shorter description."
      );
    text =
      record.output
        ?.filter((item) => item.type === "message")
        .flatMap((item) => item.content ?? [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text ?? "")
        .join("") ?? "";
  }
  if (typeof text !== "string")
    throw new Error(
      "The AI provider returned invalid content. Your page is unchanged."
    );
  if (text.length > 500000)
    throw new Error("The AI response is too large. Request fewer components.");
  try {
    return JSON.parse(
      text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")
    );
  } catch {
    throw new TemplatePlanFormatError(
      "The AI did not return a valid template plan. Try a more specific description."
    );
  }
}
