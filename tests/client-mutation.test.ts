import assert from "node:assert/strict";
import test from "node:test";
import { toast } from "sonner";

import { notifyMutation } from "../lib/client-mutation";

test("mutation handlers remain pending until the server request finishes", async (context) => {
  context.mock.method(toast, "promise", () => 123);
  let resolveRequest!: (value: string) => void;
  const request = new Promise<string>((resolve) => {
    resolveRequest = resolve;
  });
  let finished = false;
  const result = notifyMutation(request, {
    loading: "Saving",
    success: "Saved",
    error: "Failed",
  }).then((value) => {
    finished = true;
    return value;
  });
  await Promise.resolve();
  assert.equal(finished, false);
  resolveRequest("server record");
  assert.equal(await result, "server record");
  assert.equal(finished, true);
});

test("failed requests remain observed and reach the toast rollback handler", async (context) => {
  let rollbackCalled = false;
  context.mock.method(
    toast,
    "promise",
    (
      request: Promise<unknown>,
      options: { error: (error: Error) => string }
    ) => {
      void request.catch((error) =>
        options.error(error instanceof Error ? error : new Error(String(error)))
      );
      return 123;
    }
  );
  const result = await notifyMutation(
    Promise.reject(new Error("Database offline")),
    {
      loading: "Deleting",
      success: "Deleted",
      error: (error) => {
        assert.equal(error.message, "Database offline");
        rollbackCalled = true;
        return "Restored locally";
      },
    }
  );
  assert.equal(result, undefined);
  assert.equal(rollbackCalled, true);
});
