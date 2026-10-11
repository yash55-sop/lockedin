"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { File, Folder } from "@/types/db";

import { useAppState } from "@/hooks/use-app-state";
import { updateFileInDb, updateFolderInDb } from "@/lib/db/queries";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

type Target = { item: File | Folder; kind: "file" | "folder" };

function RenameDialog({
  target,
  close,
}: {
  target: Target;
  close: () => void;
}) {
  const { updateFile, updateFolder } = useAppState();
  const [title, setTitle] = useState(target.item.title);
  const [saving, setSaving] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {target.kind}</DialogTitle>
          <DialogDescription>
            Choose a name for your {target.kind}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving || !title.trim()) return;
            setSaving(true);
            try {
              const item = { id: target.item.id, title: title.trim() };
              if (target.kind === "file")
                updateFile(await updateFileInDb(item));
              else updateFolder(await updateFolderInDb(item));
              toast.success("Name updated.");
              close();
            } catch {
              toast.error("Unable to rename. Please try again.");
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4"
        >
          <Input
            autoFocus
            aria-label="New name"
            value={title}
            maxLength={200}
            disabled={saving}
            onChange={(event) => setTitle(event.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={close}
            >
              Cancel
            </Button>
            <Button disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Save name"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useRenameItem() {
  const { files, folders } = useAppState();
  const [target, setTarget] = useState<Target | null>(null);
  return {
    renameFile(id: string) {
      const item = files.find((file) => file.id === id);
      if (item) setTarget({ item, kind: "file" });
    },
    renameFolder(id: string) {
      const item = folders.find((folder) => folder.id === id);
      if (item) setTarget({ item, kind: "folder" });
    },
    dialog:
      target ?
        <RenameDialog
          key={`${target.kind}:${target.item.id}`}
          target={target}
          close={() => setTarget(null)}
        />
      : null,
  };
}
