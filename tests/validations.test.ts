import assert from "node:assert/strict";
import test from "node:test";

import {
  emailSchema,
  loginSchema,
  passwordSchema,
  signUpSchema,
} from "../lib/validations";

test("email identity is normalized consistently for registration and login", () => {
  assert.equal(emailSchema.parse("  Alice@Example.COM  "), "alice@example.com");
  const parsed = loginSchema.parse({
    type: "email",
    email: "Alice@Example.COM",
    password: "GoodPass1!",
  });
  assert.ok(parsed.type === "email");
  assert.equal(parsed.email, "alice@example.com");
});

test("username and email credentials use their own discriminated validation", () => {
  assert.ok(
    loginSchema.safeParse({
      type: "username",
      username: "alice_123",
      password: "GoodPass1!",
    }).success
  );
  assert.equal(
    loginSchema.safeParse({
      type: "email",
      username: "alice_123",
      password: "GoodPass1!",
    }).success,
    false
  );
});

test("registration rejects mismatched passwords and hidden whitespace", () => {
  assert.equal(
    signUpSchema.safeParse({
      email: "alice@example.com",
      password: "GoodPass1!",
      confirmPassword: "OtherPass1!",
    }).success,
    false
  );
  for (const password of ["Good Pass1!", "GoodPass1!\n", " GoodPass1!"]) {
    assert.equal(passwordSchema.safeParse(password).success, false);
  }
});

test("passwords cannot exceed bcrypt's byte limit even with multibyte characters", () => {
  assert.equal(
    passwordSchema.safeParse("Aa1!" + "é".repeat(35)).success,
    false
  );
  assert.equal(passwordSchema.safeParse("Aa1!" + "é".repeat(34)).success, true);
});
