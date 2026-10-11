import React from "react";
import {
  FileIcon,
  Folder,
  Ghost,
  Trash2,
  TrashIcon,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import type { File } from "@/types/db";

import { useAppState } from "@/hooks/use-app-state";
import { notifyMutation } from "@/lib/client-mutation";
import {
  deleteFileFromDb,
  deleteFolderFromDb,
  updateFileInDb,
  updateFolderInDb,
} from "@/lib/db/queries";
import { Button } from "./ui/button";
import { DialogClose, DialogFooter } from "./ui/dialog";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Trash() {
  const [isClearing, setIsClearing] = React.useState(false);
  const {
    files,
    addFile,
    updateFile,
    deleteFile,
    folders,
    addFolder,
    updateFolder,
    deleteFolder,
  } = useAppState();

  const trashedFiles = files.filter((file) => file.inTrash);
  const trashedFolders = folders.filter((folder) => folder.inTrash);

  async function restoreFile(fileId: string) {
    const file = files.find((f) => f.id === fileId);

    if (!file) {
      toast.error("Something went wrong", { description: "File not found." });
      return;
    }

    const updatedFile: File = { ...file, inTrash: false };
    updateFile(updatedFile);

    await notifyMutation(
      updateFileInDb({ id: updatedFile.id, inTrash: updatedFile.inTrash }),
      {
        loading: "Restoring file...",
        success: "File restored",
        error: () => {
          updateFile(file);
          return "Failed to restore file";
        },
      }
    );
  }

  async function restoreFolder(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);

    if (!folder) {
      toast.error("Something went wrong", { description: "Folder not found." });
      return;
    }

    const updatedFolder: File = { ...folder, inTrash: false };
    updateFolder(updatedFolder);

    await notifyMutation(
      updateFolderInDb({
        id: updatedFolder.id,
        inTrash: updatedFolder.inTrash,
      }),
      {
        loading: "Restoring folder...",
        success: "Folder restored",
        error: () => {
          updateFolder(folder);
          return "Failed to restore folder";
        },
      }
    );
  }

  async function deleteFileHandler(fileId: string) {
    const file = files.find((f) => f.id === fileId);
    deleteFile(fileId);

    await notifyMutation(deleteFileFromDb(fileId), {
      loading: "Deleting file...",
      success: "File deleted permanently.",
      error: () => {
        if (file) addFile(file);
        return "Something went wrong! Unable to delete file.";
      },
    });
  }

  async function deleteFolderHandler(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);
    const childFiles = files.filter((f) => f.folderId === folderId);
    deleteFolder(folderId);

    await notifyMutation(deleteFolderFromDb(folderId), {
      loading: "Deleting folder...",
      success: "Folder deleted permanently.",
      error: () => {
        if (folder) addFolder(folder);
        childFiles.forEach(addFile);
        return "Something went wrong! Unable to delete folder.";
      },
    });
  }

  async function clearTrash() {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const folderIds = new Set(trashedFolders.map((folder) => folder.id));
      await Promise.all(
        trashedFiles
          .filter((file) => !folderIds.has(file.folderId ?? undefined))
          .map((file) => deleteFileHandler(file.id!))
      );
      await Promise.all(
        trashedFolders.map((folder) => deleteFolderHandler(folder.id!))
      );
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <React.Fragment>
      <div className="flex flex-col gap-4 p-4">
        <h3 className="font-heading text-3xl drop-shadow-md">
          Trashed Folders
        </h3>

        {trashedFolders.length > 0 ?
          <ScrollArea>
            <div className="mb-6 flex h-full gap-4">
              {trashedFolders.map((folder) => (
                <div
                  key={folder.id}
                  title={folder.title}
                  className="size-44 space-y-4"
                >
                  <div className="group relative rounded-md border shadow">
                    <div className="mx-auto flex h-36 items-center justify-center text-5xl drop-shadow-md">
                      {folder.iconId ? folder.iconId : <Folder size={56} />}
                    </div>

                    <div className="absolute inset-0 hidden items-center justify-center space-x-2 backdrop-blur-sm group-hover:flex">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => restoreFolder(folder.id!)}
                          >
                            <Undo2 size={20} />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>Restore</TooltipContent>
                      </Tooltip>

                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => deleteFolderHandler(folder.id!)}
                          >
                            <Trash2 size={20} />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>Delete Permanently</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <p className="truncate text-center font-medium">
                    {folder.title}
                  </p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        : <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-10 font-medium drop-shadow-md">
            <Ghost size={32} className="drop-shadow" />
            <span className="drop-shadow-sm">Nothing to show here!</span>
          </div>
        }

        <h3 className="font-heading text-3xl drop-shadow-md">Trashed Files</h3>

        {trashedFiles.length > 0 ?
          <ScrollArea>
            <div className="mb-6 flex h-full gap-4">
              {trashedFiles.map((file) => (
                <div
                  key={file.id}
                  title={file.title}
                  className="size-44 space-y-4"
                >
                  <div className="group relative rounded-md border shadow">
                    <div className="mx-auto flex h-36 items-center justify-center text-5xl drop-shadow-md">
                      {file.iconId ? file.iconId : <FileIcon size={56} />}
                    </div>

                    <div className="absolute inset-0 hidden items-center justify-center space-x-2 backdrop-blur-sm group-hover:flex">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => restoreFile(file.id!)}
                          >
                            <Undo2 size={20} />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>Restore</TooltipContent>
                      </Tooltip>

                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => deleteFileHandler(file.id!)}
                          >
                            <Trash2 size={20} />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>Delete Permanently</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <p className="truncate text-center font-medium">
                    {file.title}
                  </p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        : <div className="flex flex-col items-center gap-4 rounded-md border border-dashed py-10 font-medium drop-shadow-md">
            <Ghost size={32} className="drop-shadow" />
            <span className="drop-shadow-sm">Nothing to show here!</span>
          </div>
        }
      </div>

      <DialogFooter>
        <Button
          size="sm"
          variant="destructive"
          onClick={clearTrash}
          disabled={
            isClearing || (!trashedFiles.length && !trashedFolders.length)
          }
        >
          <TrashIcon className="mr-1 size-4" /> Clear Trash
        </Button>

        <DialogClose asChild>
          <Button size="sm">Close</Button>
        </DialogClose>
      </DialogFooter>
    </React.Fragment>
  );
}
