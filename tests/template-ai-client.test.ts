import assert from "node:assert/strict";
import test from "node:test";

import {
  getTemplateAiConfig,
  localStudioAiAllowed,
  requestTemplateJson,
} from "../lib/template-ai-client";

const config = getTemplateAiConfig({ ORCAROUTER_API_KEY: "test-only-key" });
test("provider configuration uses Orca defaults and rejects unsafe base URLs", () => {
  assert.equal(config.protocol, "chat");
  assert.equal(config.baseUrl, "https://api.orcarouter.ai/v1");
  assert.equal(config.model, "z-ai/glm-5.3-flash-free");
  assert.equal(
    getTemplateAiConfig({ OPENAI_API_KEY: "test" }).protocol,
    "responses"
  );
  assert.throws(() =>
    getTemplateAiConfig({
      AI_API_KEY: "test",
      AI_BASE_URL: "http://insecure.test/v1",
    })
  );
  assert.throws(() =>
    getTemplateAiConfig({
      AI_API_KEY: "test",
      AI_BASE_URL: "https://test.test/v1?token=test",
    })
  );
});
test("anonymous local studio AI is opt-in, loopback-only, same origin and development-only", () => {
  const environment = {
    NODE_ENV: "development",
    AI_ALLOW_LOCAL_STUDIO: "true",
  };
  assert.equal(
    localStudioAiAllowed(
      "127.0.0.1:3001",
      "http://127.0.0.1:3001",
      environment
    ),
    true
  );
  for (const [host, origin] of [
    ["example.com", null],
    ["localhost:3001", "https://evil.test"],
    ["localhost:3001", "http://localhost:3002"],
  ])
    assert.equal(localStudioAiAllowed(host, origin, environment), false);
  assert.equal(
    localStudioAiAllowed("localhost", null, {
      ...environment,
      NODE_ENV: "production",
    }),
    false
  );
  assert.equal(
    localStudioAiAllowed("localhost", null, { NODE_ENV: "development" }),
    false
  );
});
test("compatible provider requests parse completed JSON and never send the key in payload", async () => {
  let sent = "";
  const fake: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.orcarouter.ai/v1/chat/completions");
    sent = String(init?.body);
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: '{"title":"Study"}' } },
      ],
    });
  };
  assert.deepEqual(
    await requestTemplateJson(
      config,
      "JSON plan",
      "create a study page",
      undefined,
      fake
    ),
    { title: "Study" }
  );
  assert.ok(!sent.includes(config.key));
});
test("strict format also supplies the complete contract to compatible models", async () => {
  const schema = { type: "object", properties: { ok: { type: "boolean" } } };
  const fake: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as {
      messages: { content: string }[];
    };
    assert.ok(body.messages[0].content.includes(JSON.stringify(schema)));
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }],
    });
  };
  assert.deepEqual(
    await requestTemplateJson(config, "Build a plan", "request", schema, fake),
    { ok: true }
  );
});
test("schema fallback is bounded and preserves request while local validation remains required", async () => {
  const bodies: string[] = [];
  const fake: typeof fetch = async (_url, init) => {
    bodies.push(String(init?.body));
    return bodies.length === 1 ?
        new Response("unsupported", { status: 400 })
      : Response.json({
          choices: [
            { finish_reason: "stop", message: { content: '{"ok":true}' } },
          ],
        });
  };
  assert.deepEqual(
    await requestTemplateJson(
      config,
      "JSON plan",
      "same prompt",
      { type: "object" },
      fake
    ),
    { ok: true }
  );
  assert.equal(bodies.length, 2);
  assert.ok(bodies.every((body) => body.includes("same prompt")));
  assert.equal(
    (JSON.parse(bodies[1]) as { response_format: { type: string } })
      .response_format.type,
    "json_object"
  );
});
test("invalid, refused, truncated and rate-limited responses are errors rather than success", async () => {
  for (const response of [
    Response.json({
      choices: [{ finish_reason: "length", message: { content: "{}" } }],
    }),
    Response.json({
      choices: [{ finish_reason: "stop", message: { content: "not json" } }],
    }),
    new Response("limited", { status: 429 }),
    new Response("bad key", { status: 401 }),
  ]) {
    const fake: typeof fetch = async () => response;
    await assert.rejects(() =>
      requestTemplateJson(config, "JSON plan", "request", undefined, fake)
    );
  }
});
