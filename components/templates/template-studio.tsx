"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileText,
  LayoutTemplate,
  LockKeyhole,
  PanelLeft,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type {
  ReusableTemplate,
  TemplateWorkspace,
} from "@/lib/template-workspace";
import type { TemplateDocument } from "@/lib/templates";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addWorkspacePage,
  createTemplateWorkspace,
  legacyDraftKey,
  libraryChangeEvent,
  localLibraryKey,
  maxWorkspacePages,
  parseReusableTemplates,
  parseTemplateWorkspace,
  persistTemplateWorkspace,
  removeWorkspacePage,
  selectWorkspacePage,
  updateWorkspacePage,
  workspaceStorageKey,
} from "@/lib/template-workspace";
import {
  blankDocument,
  createStarterTemplate,
  starterTemplates,
} from "@/lib/templates";
import { cn } from "@/lib/utils";
import { TemplateEditor } from "./template-editor";

function downloadBackup(content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "lockedin-workspace-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function TemplateStudio({
  aiAvailable = false,
}: {
  aiAvailable?: boolean;
}) {
  const [workspace, setWorkspace] = useState<TemplateWorkspace | null>(null);
  const workspaceRef = useRef<TemplateWorkspace | null>(null);
  const expectedStorage = useRef<string | null>(null);
  const currentDocument = useRef<TemplateDocument | null>(null);
  const mobileSidebarTrigger = useRef<HTMLButtonElement | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [corruptBackup, setCorruptBackup] = useState<string | null>(null);
  const [library, setLibrary] = useState<ReusableTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(workspaceStorageKey);
      const loaded =
        raw ?
          parseTemplateWorkspace(raw)
        : createTemplateWorkspace(localStorage.getItem(legacyDraftKey));
      expectedStorage.current = raw;
      workspaceRef.current = loaded;
      currentDocument.current = loaded.pages.find(
        (page) => page.id === loaded.activePageId
      )!.document;
      setWorkspace(loaded);
      // Migration does not remove or replace legacy draft/library storage.
      if (!raw) {
        const serialized = JSON.stringify(loaded);
        localStorage.setItem(workspaceStorageKey, serialized);
        expectedStorage.current = serialized;
      }
    } catch {
      const fallback = createTemplateWorkspace();
      workspaceRef.current = fallback;
      currentDocument.current = fallback.pages[0].document;
      setWorkspace(fallback);
      if (raw) setCorruptBackup(raw);
      else {
        try {
          setCorruptBackup(localStorage.getItem(legacyDraftKey));
        } catch {
          /* Storage may be disabled. */
        }
      }
      setStorageError(
        "Your browser workspace could not be loaded. Stored content has not been replaced. Export a backup before resetting, or keep this page open and export your edits."
      );
    }
    const refreshLibrary = () => {
      try {
        setLibrary(
          parseReusableTemplates(localStorage.getItem(localLibraryKey))
        );
      } catch {
        setLibrary([]);
      }
    };
    refreshLibrary();
    const storageChanged = (event: StorageEvent) => {
      if (event.key === localLibraryKey) refreshLibrary();
      if (
        event.key === workspaceStorageKey &&
        event.newValue !== expectedStorage.current
      )
        setStorageError(
          "This workspace changed in another tab. Your current edits remain here. Export them before reloading to review the other version."
        );
    };
    window.addEventListener(libraryChangeEvent, refreshLibrary);
    window.addEventListener("storage", storageChanged);
    return () => {
      window.removeEventListener(libraryChangeEvent, refreshLibrary);
      window.removeEventListener("storage", storageChanged);
    };
  }, []);

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]"))
        return;
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches)
          setSidebarVisible((value) => !value);
        else setMobileOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);

  const persist = useCallback(
    (next: TemplateWorkspace) => {
      workspaceRef.current = next;
      setWorkspace(next);
      try {
        if (corruptBackup)
          throw new Error(
            "Download your stored backup and reset the workspace before saving new pages."
          );
        const serialized = persistTemplateWorkspace(
          localStorage,
          next,
          expectedStorage.current
        );
        expectedStorage.current = serialized;
        setStorageError(null);
        return true;
      } catch (error) {
        setStorageError(
          error instanceof Error ?
            error.message
          : "Browser storage is unavailable or full. Your page remains open; export it to keep a copy."
        );
        return false;
      }
    },
    [corruptBackup]
  );

  const documentChanged = useCallback(
    (document: TemplateDocument) => {
      currentDocument.current = document;
      const current = workspaceRef.current;
      if (!current) return;
      const page = current.pages.find(
        (entry) => entry.id === current.activePageId
      )!;
      if (JSON.stringify(page.document) === JSON.stringify(document)) return;
      try {
        persist(updateWorkspacePage(current, current.activePageId, document));
      } catch {
        setStorageError(
          "Finish the page title and valid component fields before changing pages. Your current edits remain open."
        );
      }
    },
    [persist]
  );

  function flushActive() {
    const current = workspaceRef.current;
    if (!current || !currentDocument.current) return false;
    if (
      current.pages.find((page) => page.id === current.activePageId)
        ?.recoveryDraftKey
    ) {
      toast.info(
        "Restore or discard your previous draft before changing pages."
      );
      return false;
    }
    try {
      const next = updateWorkspacePage(
        current,
        current.activePageId,
        currentDocument.current
      );
      if (!persist(next)) {
        toast.error(
          "Your current page could not be saved. Keep it open or export it before changing pages."
        );
        return false;
      }
      return true;
    } catch {
      toast.error(
        "Finish the page title and valid component fields before changing pages."
      );
      return false;
    }
  }

  function switchPage(pageId: string) {
    if (pageId === workspaceRef.current?.activePageId) {
      setMobileOpen(false);
      return;
    }
    if (!flushActive()) return;
    const previous = workspaceRef.current!;
    const next = selectWorkspacePage(previous, pageId);
    if (!persist(next)) {
      workspaceRef.current = previous;
      setWorkspace(previous);
      return;
    }
    currentDocument.current = next.pages.find(
      (page) => page.id === pageId
    )!.document;
    setMobileOpen(false);
  }

  function newPage(document: TemplateDocument) {
    if (!flushActive()) return;
    const previous = workspaceRef.current!;
    try {
      const next = addWorkspacePage(previous, document);
      if (!persist(next)) {
        workspaceRef.current = previous;
        setWorkspace(previous);
        return;
      }
      currentDocument.current = next.pages.find(
        (page) => page.id === next.activePageId
      )!.document;
      setGalleryOpen(false);
      setMobileOpen(false);
      setSearch("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add this page."
      );
    }
  }

  function resolveDraft() {
    const current = workspaceRef.current;
    if (!current) return false;
    const next = {
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== current.activePageId) return page;
        const { recoveryDraftKey: _recoveryDraftKey, ...resolved } = page;
        return resolved;
      }),
    };
    if (persist(next)) return true;
    workspaceRef.current = current;
    setWorkspace(current);
    return false;
  }

  function resetWorkspace() {
    try {
      if (corruptBackup)
        localStorage.setItem(
          `${workspaceStorageKey}:backup:${Date.now()}`,
          corruptBackup
        );
      const next = createTemplateWorkspace();
      const serialized = JSON.stringify(next);
      localStorage.setItem(workspaceStorageKey, serialized);
      expectedStorage.current = serialized;
      workspaceRef.current = next;
      currentDocument.current = next.pages[0].document;
      setWorkspace(next);
      setCorruptBackup(null);
      setStorageError(null);
      toast.success(
        "Workspace reset. The previous stored content is kept as a browser backup."
      );
    } catch {
      toast.error(
        "Browser storage is unavailable. Download the backup and your current page before closing."
      );
    }
  }

  if (!workspace)
    return (
      <div role="status" className="p-8 text-sm text-muted-foreground">
        Opening your workspace...
      </div>
    );
  const active = workspace.pages.find(
    (page) => page.id === workspace.activePageId
  )!;
  const pages = workspace.pages.filter((page) =>
    page.document.title.toLowerCase().includes(search.toLowerCase())
  );
  const sidebar = (
    <div className="flex h-full min-h-0 flex-col gap-5 p-4">
      <div className="flex items-center gap-2 px-1 text-sm font-semibold">
        <LockKeyhole className="size-4" />
        <span>LockedIn</span>
      </div>
      <div className="space-y-2">
        <Button
          className="w-full justify-start"
          variant="outline"
          size="sm"
          disabled={workspace.pages.length >= maxWorkspacePages}
          onClick={() =>
            newPage({ ...blankDocument(), title: "Untitled page" })
          }
        >
          <Plus className="mr-2 size-4" />
          New page
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search workspace pages"
            className="h-9 pl-8 text-xs"
            placeholder="Search pages"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <nav
        aria-label="Workspace pages"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto"
      >
        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
          Your pages
        </p>
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            aria-label={`Open page ${page.document.title || "Untitled page"}`}
            aria-current={page.id === active.id ? "page" : undefined}
            onClick={() => switchPage(page.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              page.id === active.id && "bg-muted font-medium"
            )}
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {page.document.title || "Untitled page"}
            </span>
          </button>
        ))}
        {!pages.length && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            No matching pages.
          </p>
        )}
      </nav>
      <div className="space-y-1 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={workspace.pages.length >= maxWorkspacePages}
          onClick={() => {
            setMobileOpen(false);
            setGalleryOpen(true);
          }}
        >
          <LayoutTemplate className="mr-2 size-4" />
          Templates
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={workspace.pages.length >= maxWorkspacePages}
          onClick={() =>
            newPage({
              ...active.document,
              title: `${active.document.title.slice(0, 193)} (copy)`,
            })
          }
        >
          <Copy className="mr-2 size-4" />
          Duplicate current page
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => {
            setMobileOpen(false);
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="mr-2 size-4" />
          Delete current page
        </Button>
        <p className="px-2 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          Saved on this device.
          <br />
          Export pages to keep a portable copy.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarVisible && (
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-muted/20 md:block">
          {sidebar}
        </aside>
      )}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0"
          onCloseAutoFocus={(event) => {
            if (
              !galleryOpen &&
              !deleteOpen &&
              !window.matchMedia("(min-width: 768px)").matches
            ) {
              event.preventDefault();
              mobileSidebarTrigger.current?.focus();
            }
          }}
        >
          <SheetTitle className="sr-only">
            LockedIn workspace navigation
          </SheetTitle>
          <SheetDescription className="sr-only">
            Choose a page or create a new productivity template.
          </SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>
      <main className="min-w-0 flex-1">
        <header className="flex h-12 items-center gap-3 border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            ref={mobileSidebarTrigger}
            aria-label="Open workspace sidebar"
            onClick={() => setMobileOpen(true)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 md:inline-flex"
            aria-label={
              sidebarVisible ?
                "Hide workspace sidebar"
              : "Show workspace sidebar"
            }
            onClick={() => setSidebarVisible(!sidebarVisible)}
          >
            <PanelLeft className="size-4" />
          </Button>
          <span className="truncate text-xs text-muted-foreground">
            Your pages / {active.document.title || "Untitled page"}
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {storageError && (
          <div
            role="alert"
            className="mx-4 mt-4 space-y-2 rounded-md border p-3 text-sm text-destructive"
          >
            <p>{storageError}</p>
            {corruptBackup && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadBackup(corruptBackup)}
                >
                  <Download className="mr-2 size-4" />
                  Download stored backup
                </Button>
                <Button size="sm" variant="outline" onClick={resetWorkspace}>
                  Reset workspace and keep backup
                </Button>
              </div>
            )}
          </div>
        )}
        <TemplateEditor
          key={active.id}
          initialDocument={active.document}
          localPageId={active.id}
          recoveryDraftKey={active.recoveryDraftKey}
          aiAvailable={aiAvailable}
          onDocumentChange={documentChanged}
          autosaveError={Boolean(storageError)}
          onLocalSave={(document) => {
            currentDocument.current = document;
            try {
              return persist(
                updateWorkspacePage(workspaceRef.current!, active.id, document)
              );
            } catch {
              return false;
            }
          }}
          onDraftResolved={resolveDraft}
        />
      </main>
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start a new page</DialogTitle>
            <DialogDescription>
              Each template opens as a separate editable page. Your current page
              stays saved.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="outline"
            onClick={() =>
              newPage({ ...blankDocument(), title: "Untitled page" })
            }
          >
            <Plus className="mr-2 size-4" />
            Blank page
          </Button>
          <p className="text-sm font-medium">Starter templates</p>
          <div className="grid grid-cols-2 gap-2">
            {starterTemplates.map((starter) => (
              <Button
                key={starter.name}
                variant="outline"
                className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left"
                onClick={() => newPage(createStarterTemplate(starter.name))}
              >
                {starter.name}
              </Button>
            ))}
          </div>
          <p className="text-sm font-medium">Your reusable templates</p>
          {library.length ?
            library.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                className="justify-start"
                onClick={() =>
                  newPage({
                    ...item.document,
                    title: item.name.slice(0, 200) || item.document.title,
                  })
                }
              >
                {item.name}
              </Button>
            ))
          : <p className="text-xs text-muted-foreground">
              Save a reusable copy with My templates in the editor. Your library
              stays separate from these workspace pages.
            </p>
          }
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {active.document.title || "this page"}?
            </DialogTitle>
            <DialogDescription>
              This removes the page from this device. Export it first if you
              want to keep a copy. Reusable templates in your library are
              preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!flushActive()) return;
                const previous = workspaceRef.current!;
                const next = removeWorkspacePage(
                  previous,
                  previous.activePageId
                );
                if (!persist(next)) {
                  workspaceRef.current = previous;
                  setWorkspace(previous);
                  return;
                }
                currentDocument.current = next.pages.find(
                  (page) => page.id === next.activePageId
                )!.document;
                setDeleteOpen(false);
                setMobileOpen(false);
              }}
            >
              Delete page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
