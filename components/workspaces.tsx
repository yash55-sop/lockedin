"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Workspace } from "@/types/db";

import { useAppState } from "@/hooks/use-app-state";
import {
  getCollaboratingWorkspaces,
  getPrivateWorkspaces,
  getSharedWorkspaces,
} from "@/lib/db/queries";
import { buttonVariants } from "./ui/button";

export function Workspaces() {
  const { user } = useAppState();
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    Promise.all([
      getPrivateWorkspaces(user.id),
      getSharedWorkspaces(user.id),
      getCollaboratingWorkspaces(user.id),
    ])
      .then((groups) => {
        if (active)
          setWorkspaces([
            ...new Map(
              groups
                .flat()
                .filter((workspace) => !workspace.inTrash)
                .map((workspace) => [workspace.id, workspace])
            ).values(),
          ]);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  return (
    <div className="space-y-3 py-4">
      {error ?
        <p role="alert" className="text-sm text-destructive">
          Unable to load workspaces. Close this dialog and try again.
        </p>
      : workspaces === null ?
        <p role="status" className="text-sm text-muted-foreground">
          Loading workspaces...
        </p>
      : workspaces.length ?
        workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={`/dashboard/${workspace.id}`}
            className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted"
          >
            <span>{workspace.iconId || "💼"}</span>
            <span>{workspace.title}</span>
          </Link>
        ))
      : <p className="text-sm text-muted-foreground">
          Create a workspace to get started.
        </p>
      }
      <Link
        href="/dashboard/new-workspace"
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Create workspace
      </Link>
    </div>
  );
}
