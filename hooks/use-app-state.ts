import React from "react";
import { proxy, useSnapshot } from "valtio";

import type { User } from "next-auth";
import type { File, Folder } from "@/types/db";

export type AppState = {
  user: User | null;
  files: File[];
  folders: Folder[];
};

export type AppAction = {
  addFile: (file: File) => void;
  updateFile: (file: File) => void;
  deleteFile: (fileId: string) => void;

  addFolder: (folder: Folder) => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (folderId: string) => void;
};

export function createStore(initialState: AppState) {
  const store = proxy<AppState & AppAction>({
    user: initialState.user ? { ...initialState.user } : null,
    files: initialState.files.map((file) => ({ ...file })),
    folders: initialState.folders.map((folder) => ({ ...folder })),

    addFile(file) {
      if (!store.files.some((f) => f.id === file.id)) store.files.push(file);
    },
    updateFile(file) {
      store.files = store.files.map((f) => (f.id === file.id ? file : f));
    },
    deleteFile(id) {
      store.files = store.files.filter((f) => f.id !== id);
    },

    addFolder(folder) {
      if (!store.folders.some((f) => f.id === folder.id))
        store.folders.push(folder);
    },
    updateFolder(folder: Folder) {
      store.folders = store.folders.map((f) =>
        f.id === folder.id ? folder : f
      );
    },
    deleteFolder(id) {
      store.folders = store.folders.filter((f) => f.id !== id);
      store.files = store.files.filter((f) => f.folderId !== id);
    },
  });
  return store;
}

export type Store = ReturnType<typeof createStore>;

export const AppStateContext = React.createContext<Store | null>(null);

export function useAppState() {
  const store = React.useContext(AppStateContext);
  if (!store)
    throw new Error("Cannot use `useAppState` outside of a `StoreProvider`");

  return useSnapshot(store);
}
