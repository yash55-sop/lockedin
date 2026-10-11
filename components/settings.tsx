"use client";

import Link from "next/link";

import { useAppState } from "@/hooks/use-app-state";
import { ThemeToggle } from "./theme-toggle";
import { buttonVariants } from "./ui/button";

export function Settings() {
  const { user } = useAppState();
  return (
    <div className="space-y-4 py-4 text-sm">
      <div className="space-y-1">
        <p className="font-medium">Your account</p>
        <p className="text-muted-foreground">
          {user?.name || user?.username || "Personal workspace"}
        </p>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <span>Appearance</span>
        <ThemeToggle />
      </div>
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href="/reset-password"
      >
        Change password
      </Link>
      <p className="text-xs text-muted-foreground">
        Password changes require your current password. Pages save to your
        workspace; reusable templates and draft recovery are stored in this
        browser.
      </p>
    </div>
  );
}
