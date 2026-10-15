"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Palette,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type {
  TemplateBlock,
  TemplateColor,
  TemplateDocument,
} from "@/lib/templates";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { AppStateContext } from "@/hooks/use-app-state";
import { saveTemplateDocument } from "@/lib/template-actions";
import { detachTaskSource, localCalendarDate } from "@/lib/template-derived";
import { planLocalTemplateEdit } from "@/lib/template-edit-plan";
import {
  generateAiTemplate,
  refineAiTemplate,
} from "@/lib/template-generation";
import { composeProductivityTemplate } from "@/lib/template-recipes";
import {
  copyTemplateDocument,
  libraryChangeEvent,
  parseReusableTemplates,
} from "@/lib/template-workspace";
import {
  blankDocument,
  componentCatalog,
  createBlock,
  newId,
  starterTemplates,
  templateColors,
  templateDocumentSchema,
} from "@/lib/templates";
import { cn } from "@/lib/utils";
import { TemplateBlockContent, textareaClass } from "./template-block";

type EditorProps = {
  initialDocument?: TemplateDocument;
  target?: { kind: "workspace" | "file"; id: string };
  userId?: string;
  legacy?: boolean;
  legacyData?: string | null;
  aiAvailable?: boolean;
  initialData?: string | null;
  localPageId?: string;
  recoveryDraftKey?: string;
  onDocumentChange?: (document: TemplateDocument) => void;
  onLocalSave?: (document: TemplateDocument) => boolean;
  onDraftResolved?: () => boolean;
  autosaveError?: boolean;
  onCreatePage?: (document: TemplateDocument) => boolean | void;
};
type LibraryItem = { id: string; name: string; document: TemplateDocument };
const defaultDocument = blankDocument();
const selectClass =
  "h-9 rounded-md border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TemplateEditor({
  initialDocument = defaultDocument,
  target,
  userId = "local",
  legacy = false,
  legacyData,
  aiAvailable = false,
  initialData = null,
  localPageId,
  recoveryDraftKey,
  onDocumentChange,
  onLocalSave,
  onDraftResolved,
  autosaveError = false,
  onCreatePage,
}: EditorProps) {
  const router = useRouter();
  const appStore = useContext(AppStateContext);
  const expectedData = useRef(initialData);
  const expectedTitle = useRef(initialDocument.title);
  const [document, setDocument] = useState<TemplateDocument>(initialDocument);
  const [savedDocument, setSavedDocument] = useState(
    JSON.stringify(initialDocument)
  );
  const [history, setHistory] = useState<TemplateDocument[]>([]);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [draft, setDraft] = useState<TemplateDocument | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [libraryName, setLibraryName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<TemplateDocument | null>(null);
  const [composerMode, setComposerMode] = useState<"create" | "edit">(
    initialDocument.blocks.length ? "edit" : "create"
  );
  const [previewBase, setPreviewBase] = useState<string | null>(null);
  const [previewChanges, setPreviewChanges] = useState<string[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [useAi, setUseAi] = useState(aiAvailable);
  const [generating, setGenerating] = useState(false);
  const generationRequest = useRef(0);
  const createdPageFromComposer = useRef(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const draftKey =
    recoveryDraftKey ??
    `lipi:template:draft:${userId}:${target?.kind ?? (localPageId ? "local-page" : "playground")}:${target?.id ?? localPageId ?? "local"}`;
  const libraryKey = `lipi:template:library:${userId}`;
  const expectedLibrary = useRef<string | null>(null);
  const dirty = JSON.stringify(document) !== savedDocument;
  const documentRef = useRef(document);
  documentRef.current = document;
  const previousInitialTitle = useRef(initialDocument.title);
  const reportedTitleConflict = useRef<string | null>(null);
  const documentChangeCallback = useRef(onDocumentChange);
  documentChangeCallback.current = onDocumentChange;

  useEffect(() => {
    documentChangeCallback.current?.(document);
  }, [document]);

  useEffect(() => {
    if (
      localPageId &&
      !initialDocument.blocks.length &&
      initialDocument.title === "Untitled page"
    ) {
      titleInput.current?.focus();
      titleInput.current?.select();
    }
    return () => {
      // Requests use positive tokens; ignore responses after this editor unmounts.
      generationRequest.current = -1;
    };
    // An editor is remounted for every new page; focus once without interrupting typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localPageId) return;
    const previous = previousInitialTitle.current;
    if (previous === initialDocument.title) return;
    // A refresh arriving during a save can describe the record before that save.
    // Reconcile only a title paired with the same authoritative content revision.
    if (saving) return;
    if (target && initialData !== expectedData.current) {
      if (reportedTitleConflict.current !== initialDocument.title) {
        reportedTitleConflict.current = initialDocument.title;
        toast.warning(
          "This page changed elsewhere. Your draft is preserved; export it before reloading."
        );
      }
      return;
    }
    previousInitialTitle.current = initialDocument.title;
    expectedTitle.current = initialDocument.title;
    reportedTitleConflict.current = null;
    if (
      documentRef.current.title !== previous &&
      documentRef.current.title !== initialDocument.title
    )
      toast.warning(
        "The saved page title changed elsewhere. Your edited title is preserved for review before saving."
      );
    setDocument((current) =>
      current.title === previous ?
        { ...current, title: initialDocument.title }
      : current
    );
    setSavedDocument((saved) =>
      JSON.stringify({
        ...templateDocumentSchema.parse(JSON.parse(saved)),
        title: initialDocument.title,
      })
    );
  }, [initialDocument.title, initialData, saving, target, localPageId]);

  useEffect(() => {
    try {
      const storedDraft =
        !localPageId || recoveryDraftKey ?
          localStorage.getItem(draftKey)
        : null;
      if (storedDraft) {
        const result = templateDocumentSchema.safeParse(
          JSON.parse(storedDraft)
        );
        if (
          result.success &&
          JSON.stringify(result.data) !== JSON.stringify(initialDocument)
        )
          setDraft(result.data);
        else if (result.success && localPageId && recoveryDraftKey) {
          if (onDraftResolved?.() === false) setDraft(result.data);
        }
      } else if (localPageId && recoveryDraftKey) {
        if (onDraftResolved?.() === false) setDraft(initialDocument);
      }
      const storedLibrary = localStorage.getItem(libraryKey);
      expectedLibrary.current = storedLibrary;
      if (storedLibrary) {
        const items: unknown = JSON.parse(storedLibrary);
        if (Array.isArray(items))
          setLibrary(
            items
              .flatMap((item): LibraryItem[] => {
                if (typeof item !== "object" || item === null) return [];
                const candidate = item as Partial<LibraryItem>;
                const parsed = templateDocumentSchema.safeParse(
                  candidate.document
                );
                return (
                    typeof candidate.id === "string" &&
                      typeof candidate.name === "string" &&
                      parsed.success
                  ) ?
                    [
                      {
                        id: candidate.id,
                        name: candidate.name,
                        document: parsed.data,
                      },
                    ]
                  : [];
              })
              .slice(0, 30)
          );
      }
    } catch {
      setStorageError(true);
    }
    setStorageReady(true);
    // Editor is keyed to its page; restoring is explicitly chosen instead of overwriting server content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, libraryKey, localPageId, recoveryDraftKey]);

  useEffect(() => {
    const refreshLibrary = () => {
      try {
        const raw = localStorage.getItem(libraryKey);
        const parsed = parseReusableTemplates(raw);
        expectedLibrary.current = raw;
        setLibrary(parsed);
      } catch {
        setStorageError(true);
      }
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === libraryKey) refreshLibrary();
    };
    window.addEventListener(libraryChangeEvent, refreshLibrary);
    window.addEventListener("storage", storageChanged);
    return () => {
      window.removeEventListener(libraryChangeEvent, refreshLibrary);
      window.removeEventListener("storage", storageChanged);
    };
  }, [libraryKey]);

  useEffect(() => {
    if (!storageReady || draft || localPageId) return;
    try {
      if (dirty || !target)
        localStorage.setItem(draftKey, JSON.stringify(document));
      else localStorage.removeItem(draftKey);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [document, dirty, draft, draftKey, storageReady, target, localPageId]);

  useEffect(() => {
    if (!dirty || (localPageId && !autosaveError)) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, localPageId, autosaveError]);

  function change(next: TemplateDocument, recordHistory = true) {
    if (draft) return;
    if (recordHistory)
      setHistory((previous) => [...previous.slice(-29), document]);
    setDocument(next);
    onDocumentChange?.(next);
  }
  function changeBlock(block: TemplateBlock) {
    change({
      ...document,
      blocks: document.blocks.map((entry) =>
        entry.id === block.id ? block : entry
      ),
    });
  }
  function appendBlocks(blocks: TemplateBlock[]) {
    if (document.blocks.length + blocks.length > 80) {
      toast.error("A template can contain up to 80 components.");
      return false;
    }
    change({ ...document, blocks: [...document.blocks, ...blocks] });
    return true;
  }
  function moveBlock(index: number, offset: number) {
    const blocks = [...document.blocks];
    [blocks[index], blocks[index + offset]] = [
      blocks[index + offset],
      blocks[index],
    ];
    change({ ...document, blocks });
  }
  function duplicateBlock(block: TemplateBlock) {
    const copy = structuredClone(block);
    copy.id = newId();
    if (copy.type === "tasks")
      copy.items = copy.items.map((item) => ({ ...item, id: newId() }));
    appendBlocks([copy]);
  }
  function applyTemplate(next: TemplateDocument, append: boolean) {
    if (draft || generating) return;
    if (previewBase !== JSON.stringify(documentRef.current)) {
      clearPreview();
      toast.error(
        "This page changed after the preview was made. Generate a fresh preview to preserve your latest changes."
      );
      return;
    }
    if (append) {
      if (!appendBlocks(copyTemplateDocument(next).blocks)) return;
    } else change(next);
    setComposerOpen(false);
    setLibraryOpen(false);
    setPreview(null);
  }
  function createPageFromPreview(next: TemplateDocument) {
    if (draft || generating || !onCreatePage) return;
    if (previewBase !== JSON.stringify(documentRef.current)) {
      clearPreview();
      toast.error(
        "This page changed after the preview was made. Generate a fresh preview first."
      );
      return;
    }
    try {
      const parsed = templateDocumentSchema.parse(next);
      if (onCreatePage(parsed) === false) return;
      createdPageFromComposer.current = true;
      setComposerOpen(false);
      clearPreview();
    } catch (error) {
      toast.error(
        error instanceof Error ?
          error.message
        : "Could not create this page. Your preview is still available."
      );
    }
  }
  function clearPreview() {
    generationRequest.current++;
    setGenerating(false);
    setPreview(null);
    setPreviewBase(null);
    setPreviewChanges([]);
    setPreviewWarnings([]);
  }
  function showPreview(
    next: TemplateDocument,
    changes: string[] = [],
    warnings: string[] = []
  ) {
    setPreview(next);
    setPreviewBase(JSON.stringify(documentRef.current));
    setPreviewChanges(changes);
    setPreviewWarnings(warnings);
  }
  async function generatePreview() {
    if (draft) return;
    clearPreview();
    const request = ++generationRequest.current;
    const base = JSON.stringify(documentRef.current);
    setGenerating(true);
    try {
      if (composerMode === "edit") {
        const edit =
          useAi ?
            await refineAiTemplate(
              prompt,
              documentRef.current,
              localCalendarDate()
            )
          : planLocalTemplateEdit(prompt, documentRef.current);
        if (request === generationRequest.current) {
          setPreview(edit.document);
          setPreviewBase(base);
          setPreviewChanges(edit.changes);
          setPreviewWarnings(edit.warnings);
        }
      } else if (useAi) {
        const next = await generateAiTemplate(prompt, localCalendarDate());
        if (request === generationRequest.current) {
          setPreview(next);
          setPreviewBase(base);
        }
      } else {
        const next = composeProductivityTemplate(prompt);
        showPreview(next.document, [], next.warnings);
        if (!next.recognized)
          toast.info(
            "No supported component names recognized. Started with a checklist and notes; try graph, heatmap, goal, table, or callout."
          );
      }
    } catch (error) {
      if (request !== generationRequest.current) return;
      toast.error(
        error instanceof Error ?
          error.message
        : "Could not generate a template. Try the local composer."
      );
    } finally {
      if (request === generationRequest.current) setGenerating(false);
    }
  }
  function saveLibrary(items: LibraryItem[]) {
    try {
      const existing = localStorage.getItem(libraryKey);
      if (existing !== expectedLibrary.current) {
        const latest = parseReusableTemplates(existing);
        setLibrary(latest);
        expectedLibrary.current = existing;
        toast.warning(
          "Your reusable library changed in another tab. The latest copies are shown; review them and try again."
        );
        return false;
      }
      const serialized = JSON.stringify(items);
      localStorage.setItem(libraryKey, serialized);
      expectedLibrary.current = serialized;
      setLibrary(items);
      window.dispatchEvent(new Event(libraryChangeEvent));
      return true;
    } catch {
      toast.error(
        "Browser storage is unavailable or full. Export your template to keep a copy."
      );
      return false;
    }
  }
  async function save() {
    if (draft || saving) return;
    const parsed = templateDocumentSchema.safeParse(document);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Check your template fields."
      );
      return;
    }
    const snapshot = JSON.stringify(parsed.data);
    const unsanitizedSnapshot = JSON.stringify(document);
    setSaving(true);
    try {
      if (target) {
        const saved = await saveTemplateDocument({
          ...target,
          document: parsed.data,
          expectedData: expectedData.current,
          expectedTitle: expectedTitle.current,
        });
        expectedData.current = snapshot;
        expectedTitle.current = parsed.data.title;
        if (saved.file && appStore) appStore.updateFile(saved.file);
      } else if (localPageId) {
        if (!onLocalSave?.(parsed.data))
          throw new Error(
            "Could not save in this browser. Your page remains open; export it to keep a copy."
          );
      } else localStorage.setItem(draftKey, snapshot);
      setDocument((current) =>
        JSON.stringify(current) === unsanitizedSnapshot ? parsed.data : current
      );
      setSavedDocument(snapshot);
      toast.success(
        target ?
          "Page saved to your workspace."
        : "Saved in this browser. Export to keep a portable copy."
      );
      if (target) router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ?
          error.message
        : "Could not save. Your draft is still in this browser."
      );
    } finally {
      setSaving(false);
    }
  }
  function exportTemplate() {
    exportDocument(document);
  }
  function exportDocument(value: TemplateDocument) {
    const result = templateDocumentSchema.safeParse(value);
    if (!result.success) {
      toast.error("Fix invalid fields before exporting.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      })
    );
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${value.title.replace(/[^a-z0-9-]/gi, "_") || "template"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function exportOriginal() {
    const url = URL.createObjectURL(
      new Blob([legacyData ?? ""], { type: "text/plain" })
    );
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "original-page-content.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function importTemplate(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 250000)
        throw new Error("Choose a template JSON file smaller than 250 KB.");
      const result = templateDocumentSchema.safeParse(
        JSON.parse(await file.text())
      );
      if (!result.success)
        throw new Error(
          "This file is not a valid LockedIn template. Export a template from LockedIn and try again."
        );
      clearPreview();
      setComposerMode("create");
      showPreview(result.data);
      setComposerOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import this file."
      );
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutTemplate className="size-4" />
          <span>
            {target || localPageId ? "Your workspace" : "Template studio"}
          </span>
          <span aria-live="polite" className="text-xs">
            {saving ?
              "Saving..."
            : localPageId ?
              autosaveError ?
                "Not saved in browser"
              : "Saved in browser"
            : dirty ?
              "Unsaved changes"
            : "Saved"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Undo last change"
            disabled={!history.length || Boolean(draft)}
            onClick={() => {
              const previous = history[history.length - 1];
              setHistory(history.slice(0, -1));
              setDocument(previous);
              onDocumentChange?.(previous);
            }}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(draft)}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Preview" : "Edit"}
          </Button>
          <Button
            size="sm"
            disabled={saving || Boolean(draft) || (Boolean(target) && !dirty)}
            onClick={() => void save()}
          >
            {saving ?
              <Loader2 className="mr-2 size-4 animate-spin" />
            : <Save className="mr-2 size-4" />}
            Save
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Page options">
                <MoreHorizontal className="mr-1.5 size-4" />
                Page options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Page options</DropdownMenuLabel>
              <DropdownMenuItem onSelect={exportTemplate}>
                <Download className="mr-2 size-4" />
                Export page
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={Boolean(draft)}
                onSelect={() => importInput.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                Import template
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={Boolean(draft)}
                onSelect={() => setLibraryOpen(true)}
              >
                <LayoutTemplate className="mr-2 size-4" />
                My templates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={Boolean(draft)}>
                  Page layout
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={String(document.columns)}
                    onValueChange={(value) =>
                      change({ ...document, columns: Number(value) as 1 | 2 })
                    }
                  >
                    <DropdownMenuRadioItem value="1">
                      One column
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="2">
                      Two columns
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={Boolean(draft)}>
                  <Palette className="mr-2 size-4" />
                  Page accent
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={document.accent}
                    onValueChange={(value) => {
                      const accent = value as TemplateColor;
                      change({
                        ...document,
                        accent,
                        blocks: document.blocks.map((block) => ({
                          ...block,
                          color:
                            block.color === document.accent ?
                              accent
                            : block.color,
                        })),
                      });
                    }}
                  >
                    {Object.keys(templateColors).map((color) => (
                      <DropdownMenuRadioItem
                        key={color}
                        value={color}
                        className="capitalize"
                      >
                        <span
                          className="mr-2 size-2 rounded-full"
                          style={{
                            backgroundColor:
                              templateColors[color as TemplateColor],
                          }}
                        />
                        {color}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!target && !localPageId && (
        <p className="text-sm text-muted-foreground">
          Build a template here, save it in this browser, or export it to use on
          a workspace page. Sign in for cloud persistence.
        </p>
      )}
      {legacy && (
        <div
          role="status"
          className="space-y-2 rounded-md border p-3 text-sm text-muted-foreground"
        >
          <p>
            Existing page content is shown as a plain-text note
            {(legacyData?.length ?? 0) > 10000 ?
              " (first 10,000 characters only)"
            : ""}
            . Saving replaces the original with this template. Download the
            original content before converting.
          </p>
          <Button size="sm" variant="outline" onClick={exportOriginal}>
            <Download className="mr-2 size-4" />
            Download original content
          </Button>
        </div>
      )}
      {draft && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm"
        >
          <span className="mr-auto">
            A previous browser draft is available.
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportDocument(draft)}
          >
            <Download className="mr-2 size-4" />
            Download draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setHistory((previous) => [...previous.slice(-29), document]);
              setDocument(draft);
              onDocumentChange?.(draft);
              if (onDraftResolved?.() !== false) setDraft(null);
            }}
          >
            Restore draft
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (onDraftResolved?.() === false) return;
              try {
                localStorage.removeItem(draftKey);
              } catch {
                setStorageError(true);
              }
              setDraft(null);
            }}
          >
            Discard draft
          </Button>
        </div>
      )}
      {storageError && (
        <p role="alert" className="text-sm text-destructive">
          Browser draft storage is unavailable. Save to your workspace or export
          your template to keep changes.
        </p>
      )}
      <fieldset disabled={Boolean(draft)} className="min-w-0 space-y-6">
        <div className="space-y-3">
          {editing ?
            <Input
              ref={titleInput}
              aria-label="Page title"
              className="h-auto border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0 sm:text-4xl"
              value={document.title}
              maxLength={200}
              placeholder="Untitled page"
              onChange={(event) =>
                change({ ...document, title: event.target.value })
              }
            />
          : <h1 className="break-words text-3xl font-semibold sm:text-4xl">
              {document.title}
            </h1>
          }
          {editing ?
            <Input
              aria-label="Page description"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              value={document.description}
              maxLength={1000}
              placeholder="Give your space a purpose..."
              onChange={(event) =>
                change({ ...document, description: event.target.value })
              }
            />
          : <p className="break-words text-sm text-muted-foreground">
              {document.description}
            </p>
          }
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog
            open={composerOpen}
            onOpenChange={(open) => {
              setComposerOpen(open);
              clearPreview();
              if (open)
                setComposerMode(
                  documentRef.current.blocks.length ? "edit" : "create"
                );
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="mr-2 size-4" />
                Vibe a template
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[85vh] max-w-2xl overflow-y-auto"
              onCloseAutoFocus={(event) => {
                if (createdPageFromComposer.current) event.preventDefault();
              }}
            >
              <DialogHeader>
                <DialogTitle>Describe your productivity space</DialogTitle>
                <DialogDescription>
                  {composerMode === "edit" ?
                    useAi ?
                      "AI edit: sends your edit description and the current template to your configured AI provider. Review the proposed changes before applying them."
                    : "Local edit: applies supported commands in this browser. Your existing data stays intact until you review and apply the changes."

                  : useAi ?
                    "AI composer: sends this description to your configured AI provider to design a template using the supported components. Preview the result before applying it."
                  : "Local composer: starts with connected study, habit, or project layouts. Study plans support one daily time window and 1–52 consecutive days. Your description stays in this browser."
                  }
                  {composerMode === "create" &&
                    onCreatePage &&
                    " A new template opens as a separate page in your sidebar."}
                </DialogDescription>
              </DialogHeader>
              <label className="flex items-center gap-2 text-sm">
                Action
                <select
                  aria-label="Template action"
                  className={selectClass}
                  value={composerMode}
                  onChange={(event) => {
                    clearPreview();
                    setComposerMode(event.target.value as "create" | "edit");
                  }}
                >
                  <option value="create">Create new template</option>
                  <option value="edit">Edit current page</option>
                </select>
              </label>
              {aiAvailable && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useAi}
                    disabled={generating}
                    onChange={(event) => {
                      clearPreview();
                      setUseAi(event.target.checked);
                    }}
                  />
                  Use AI generation
                </label>
              )}
              <textarea
                aria-label="Template description"
                rows={3}
                maxLength={2000}
                value={prompt}
                className={textareaClass}
                placeholder={
                  composerMode === "edit" ?
                    "Add a heatmap; make graphs purple; set goal target to 20"
                  : "Plan calculus for two weeks, 7–9 PM, with a purple graph and heatmap"
                }
                onChange={(event) => {
                  clearPreview();
                  setPrompt(event.target.value);
                }}
              />
              {composerMode === "edit" && !useAi && (
                <p className="text-xs text-muted-foreground">
                  Separate changes with semicolons. Try: add a green heatmap;
                  make graphs purple; rename page to &quot;My week&quot;. Use a
                  component&apos;s title in quotes to select one specific block.
                </p>
              )}
              {composerMode === "create" && (
                <div className="flex flex-wrap gap-2">
                  {starterTemplates.map((starter) => (
                    <Button
                      key={starter.name}
                      size="sm"
                      variant="secondary"
                      disabled={generating}
                      onClick={() => {
                        setPrompt(starter.prompt);
                        setUseAi(false);
                        clearPreview();
                        const composed = composeProductivityTemplate(
                          starter.prompt
                        );
                        showPreview(composed.document, [], composed.warnings);
                      }}
                    >
                      {starter.name}
                    </Button>
                  ))}
                </div>
              )}
              <Button
                disabled={!prompt.trim() || generating}
                onClick={() => void generatePreview()}
              >
                {generating ?
                  <Loader2 className="mr-2 size-4 animate-spin" />
                : <Sparkles className="mr-2 size-4" />}
                {generating ? "Designing your template..." : "Generate preview"}
              </Button>
              {preview && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">{preview.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {preview.columns} column
                      {preview.columns === 2 ? "s" : ""} · {preview.accent} ·
                      editable components
                    </p>
                  </div>
                  {previewChanges.length > 0 && (
                    <ul className="list-inside list-disc text-sm">
                      {previewChanges.map((entry, index) => (
                        <li key={index}>{entry}</li>
                      ))}
                    </ul>
                  )}
                  {previewWarnings.map((warning, index) => (
                    <p
                      key={index}
                      role="status"
                      className="text-sm text-muted-foreground"
                    >
                      {warning}
                    </p>
                  ))}
                  <div
                    className={cn(
                      "grid gap-3",
                      preview.columns === 2 && "sm:grid-cols-2"
                    )}
                  >
                    {preview.blocks.map((block) => (
                      <section
                        key={block.id}
                        className={cn(
                          "min-w-0 space-y-3 rounded-md border p-3",
                          block.type === "heading" && "sm:col-span-full"
                        )}
                        style={{ borderColor: templateColors[block.color] }}
                      >
                        <h4 className="text-sm font-medium">{block.title}</h4>
                        <TemplateBlockContent
                          block={block}
                          blocks={preview.blocks}
                          editing={false}
                          interactive={false}
                          onChange={() => {}}
                        />
                      </section>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={generating}
                      onClick={() =>
                        composerMode === "create" && onCreatePage ?
                          createPageFromPreview(preview)
                        : applyTemplate(preview, false)
                      }
                    >
                      {composerMode === "edit" ?
                        "Apply edits"
                      : onCreatePage ?
                        "Create new page"
                      : document.blocks.length ?
                        "Replace current page"
                      : "Use template"}
                    </Button>
                    {composerMode === "create" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          generating ||
                          document.blocks.length + preview.blocks.length > 80
                        }
                        onClick={() => applyTemplate(preview, true)}
                      >
                        Append to current page
                      </Button>
                    )}
                  </div>
                  {document.blocks.length > 0 &&
                    !(composerMode === "create" && onCreatePage) && (
                      <p className="text-xs text-muted-foreground">
                        Applying this preview is undoable until you leave this
                        page.
                      </p>
                    )}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={componentsOpen}
            onOpenChange={(open) => {
              setComponentsOpen(open);
              if (!open) setComponentSearch("");
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={document.blocks.length >= 80}
              >
                <Plus className="mr-2 size-4" />
                Add component
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a component</DialogTitle>
                <DialogDescription>
                  Build your page one block at a time. Every block is editable.
                </DialogDescription>
              </DialogHeader>
              <Input
                aria-label="Search components"
                placeholder="Search components..."
                value={componentSearch}
                onChange={(event) => setComponentSearch(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                {componentCatalog
                  .filter((entry) =>
                    `${entry.label} ${entry.type} ${entry.description}`
                      .toLowerCase()
                      .includes(componentSearch.trim().toLowerCase())
                  )
                  .map((entry) => (
                    <button
                      key={entry.type}
                      className="rounded-md border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        appendBlocks([
                          createBlock(entry.type, document.accent),
                        ]);
                        setComponentsOpen(false);
                        setComponentSearch("");
                      }}
                    >
                      <span className="block text-sm font-medium">
                        {entry.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {entry.description}
                      </span>
                    </button>
                  ))}
              </div>
              {!componentCatalog.some((entry) =>
                `${entry.label} ${entry.type} ${entry.description}`
                  .toLowerCase()
                  .includes(componentSearch.trim().toLowerCase())
              ) && (
                <p
                  role="status"
                  className="py-4 text-center text-sm text-muted-foreground"
                >
                  No matching components. Try tasks, graph, heatmap, table, or
                  notes.
                </p>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>My templates</DialogTitle>
                <DialogDescription>
                  Your reusable templates are stored in this browser. Export to
                  move them to another device.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  aria-label="Reusable template name"
                  maxLength={100}
                  placeholder={document.title || "Template name"}
                  value={libraryName}
                  onChange={(event) => setLibraryName(event.target.value)}
                />
                <Button
                  disabled={library.length >= 30}
                  onClick={() => {
                    const parsed = templateDocumentSchema.safeParse(document);
                    if (!parsed.success) {
                      toast.error("Check your template fields before saving.");
                      return;
                    }
                    if (
                      saveLibrary([
                        ...library,
                        {
                          id: newId(),
                          name: libraryName.trim() || document.title,
                          document: parsed.data,
                        },
                      ])
                    ) {
                      setLibraryName("");
                      toast.success("Template added to your library.");
                    }
                  }}
                >
                  Save template
                </Button>
              </div>
              {!library.length && (
                <p className="text-sm text-muted-foreground">
                  Save this page as your first reusable template.
                </p>
              )}
              {library.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border p-3"
                >
                  <span className="mr-auto text-sm">{item.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const copy = copyTemplateDocument(item.document);
                      clearPreview();
                      setComposerMode("create");
                      showPreview(copy);
                      setLibraryOpen(false);
                      setComposerOpen(true);
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={`Delete template ${item.name}`}
                    onClick={() =>
                      saveLibrary(
                        library.filter((entry) => entry.id !== item.id)
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </DialogContent>
          </Dialog>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import a LockedIn template JSON file"
            onChange={(event) => void importTemplate(event.target.files?.[0])}
          />
        </div>
        {!document.blocks.length && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <LayoutTemplate className="size-8 text-muted-foreground" />
            <h2 className="font-medium">Make this space yours</h2>
            <p className="max-w-sm px-4 text-sm text-muted-foreground">
              Describe the page you want, start with a template, or add graphs,
              habits, goals, and notes.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(true);
                setComposerOpen(true);
              }}
            >
              <Sparkles className="mr-2 size-4" />
              Build your first template
            </Button>
          </div>
        )}
        <div
          className={cn(
            "grid items-start gap-4",
            document.columns === 2 && "md:grid-cols-2"
          )}
        >
          {document.blocks.map((block, index) => (
            <section
              key={block.id}
              className={cn(
                "min-w-0 space-y-3 rounded-lg border bg-card p-4",
                block.type === "heading" && "md:col-span-full",
                document.columns === 2 &&
                  block.type === "tasks" &&
                  block.items.length > 4 &&
                  document.blocks.some(
                    (entry) =>
                      "source" in entry &&
                      entry.source?.taskBlockId === block.id
                  ) &&
                  "md:row-span-2"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: templateColors[block.color] }}
                />
                {editing ?
                  <Input
                    aria-label="Component title"
                    className="h-8 min-w-24 flex-1 border-0 px-1 font-medium shadow-none"
                    value={block.title}
                    maxLength={200}
                    onChange={(event) =>
                      changeBlock({ ...block, title: event.target.value })
                    }
                  />
                : <h2 className="min-w-0 flex-1 break-words text-sm font-medium">
                    {block.title}
                  </h2>
                }
                {editing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="ml-auto size-8 shrink-0 text-muted-foreground"
                        variant="ghost"
                        size="icon"
                        aria-label={`More options for ${block.title || "component"}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        disabled={index === 0}
                        onSelect={() => moveBlock(index, -1)}
                      >
                        <ArrowUp className="mr-2 size-4" />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={index === document.blocks.length - 1}
                        onSelect={() => moveBlock(index, 1)}
                      >
                        <ArrowDown className="mr-2 size-4" />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={document.blocks.length >= 80}
                        onSelect={() => duplicateBlock(block)}
                      >
                        <Copy className="mr-2 size-4" />
                        Duplicate component
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Palette className="mr-2 size-4" />
                          Component color
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup
                            value={block.color}
                            onValueChange={(color) =>
                              changeBlock({
                                ...block,
                                color: color as TemplateColor,
                              })
                            }
                          >
                            {Object.keys(templateColors).map((color) => (
                              <DropdownMenuRadioItem
                                key={color}
                                value={color}
                                className="capitalize"
                              >
                                <span
                                  className="mr-2 size-2 rounded-full"
                                  style={{
                                    backgroundColor:
                                      templateColors[color as TemplateColor],
                                  }}
                                />
                                {color}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => {
                          const detached =
                            block.type === "tasks" ?
                              detachTaskSource(document, block.id)
                            : document;
                          change({
                            ...detached,
                            blocks: detached.blocks.filter(
                              (entry) => entry.id !== block.id
                            ),
                          });
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete component
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <TemplateBlockContent
                block={block}
                blocks={document.blocks}
                editing={editing}
                onChange={changeBlock}
              />
            </section>
          ))}
        </div>
        {editing && document.blocks.length > 0 && (
          <Button
            variant="ghost"
            className="w-full border border-dashed"
            disabled={document.blocks.length >= 80}
            onClick={() => setComponentsOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Add a component
          </Button>
        )}
      </fieldset>
    </div>
  );
}
