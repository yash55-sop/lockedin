import { z } from "zod";

import type { TemplateDocument } from "@/lib/templates";

import { blankDocument, newId, templateDocumentSchema } from "@/lib/templates";

export const workspaceStorageKey = "lockedin:template:workspace:local";
export const legacyDraftKey = "lipi:template:draft:local:playground:local";
export const localLibraryKey = "lipi:template:library:local";
export const libraryChangeEvent = "lockedin:template-library-change";
export const maxWorkspacePages = 100;

const pageSchema = z.object({
  id: z.string().min(1).max(100),
  document: templateDocumentSchema,
  recoveryDraftKey: z.literal(legacyDraftKey).optional(),
});
export const templateWorkspaceSchema = z
  .object({
    version: z.literal(1),
    activePageId: z.string().min(1).max(100),
    pages: z.array(pageSchema).min(1).max(maxWorkspacePages),
  })
  .superRefine((workspace, context) => {
    if (
      new Set(workspace.pages.map((page) => page.id)).size !==
      workspace.pages.length
    )
      context.addIssue({
        code: "custom",
        message: "Workspace page IDs must be unique.",
      });
    if (!workspace.pages.some((page) => page.id === workspace.activePageId))
      context.addIssue({
        code: "custom",
        message: "The selected workspace page is missing.",
      });
  });

export type TemplateWorkspace = z.infer<typeof templateWorkspaceSchema>;
export type WorkspacePage = TemplateWorkspace["pages"][number];
export type ReusableTemplate = {
  id: string;
  name: string;
  document: TemplateDocument;
};

export function createTemplateWorkspace(
  legacyDraft: string | null = null
): TemplateWorkspace {
  // Keep the original draft separate until its owner chooses Restore or Discard.
  const recovered =
    legacyDraft ? templateDocumentSchema.parse(JSON.parse(legacyDraft)) : null;
  const page: WorkspacePage = {
    id: newId(),
    document: { ...blankDocument(), title: recovered?.title || "My workspace" },
  };
  if (recovered && JSON.stringify(recovered) !== JSON.stringify(page.document))
    page.recoveryDraftKey = legacyDraftKey;
  return { version: 1, activePageId: page.id, pages: [page] };
}

export function parseTemplateWorkspace(raw: string): TemplateWorkspace {
  return templateWorkspaceSchema.parse(JSON.parse(raw));
}

export function persistTemplateWorkspace(
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  },
  workspace: TemplateWorkspace,
  expected: string | null
): string {
  if (storage.getItem(workspaceStorageKey) !== expected)
    throw new Error(
      "This workspace changed in another tab. Export your current page before reloading."
    );
  const serialized = JSON.stringify(templateWorkspaceSchema.parse(workspace));
  storage.setItem(workspaceStorageKey, serialized);
  return serialized;
}

export function updateWorkspacePage(
  workspace: TemplateWorkspace,
  pageId: string,
  document: TemplateDocument
): TemplateWorkspace {
  if (!workspace.pages.some((page) => page.id === pageId))
    throw new Error("This page is no longer in your workspace.");
  return templateWorkspaceSchema.parse({
    ...workspace,
    pages: workspace.pages.map((page) =>
      page.id === pageId ? { ...page, document } : page
    ),
  });
}

export function selectWorkspacePage(
  workspace: TemplateWorkspace,
  pageId: string
): TemplateWorkspace {
  return templateWorkspaceSchema.parse({ ...workspace, activePageId: pageId });
}

export function copyTemplateDocument(
  document: TemplateDocument
): TemplateDocument {
  const copy = templateDocumentSchema.parse(structuredClone(document));
  const blockIds = new Map(copy.blocks.map((block) => [block.id, newId()]));
  copy.blocks = copy.blocks.map((block) => ({
    ...block,
    id: blockIds.get(block.id)!,
    ...("source" in block && block.source ?
      {
        source: {
          ...block.source,
          taskBlockId: blockIds.get(block.source.taskBlockId)!,
        },
      }
    : {}),
    ...(block.type === "tasks" ?
      { items: block.items.map((item) => ({ ...item, id: newId() })) }
    : {}),
  }));
  return templateDocumentSchema.parse(copy);
}

export function addWorkspacePage(
  workspace: TemplateWorkspace,
  document: TemplateDocument
): TemplateWorkspace {
  if (workspace.pages.length >= maxWorkspacePages)
    throw new Error(
      "This workspace can contain up to 100 pages. Export a page before removing it to make room."
    );
  const page = { id: newId(), document: copyTemplateDocument(document) };
  return templateWorkspaceSchema.parse({
    ...workspace,
    activePageId: page.id,
    pages: [...workspace.pages, page],
  });
}

export function removeWorkspacePage(
  workspace: TemplateWorkspace,
  pageId: string
): TemplateWorkspace {
  if (!workspace.pages.some((page) => page.id === pageId))
    throw new Error("This page is no longer in your workspace.");
  const pages = workspace.pages.filter((page) => page.id !== pageId);
  if (!pages.length) return createTemplateWorkspace();
  return templateWorkspaceSchema.parse({
    ...workspace,
    pages,
    activePageId:
      workspace.activePageId === pageId ? pages[0].id : workspace.activePageId,
  });
}

export function parseReusableTemplates(raw: string | null): ReusableTemplate[] {
  if (!raw) return [];
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries)) return [];
  return entries
    .flatMap((entry): ReusableTemplate[] => {
      const parsed = z
        .object({
          id: z.string(),
          name: z.string(),
          document: templateDocumentSchema,
        })
        .safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, 30);
}
