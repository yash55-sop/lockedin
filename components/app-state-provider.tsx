"use client";

import React from "react";

import type { AppState } from "@/hooks/use-app-state";

import { AppStateContext, createStore } from "@/hooks/use-app-state";

type AppStateProviderProps = React.PropsWithChildren<AppState>;

export function AppStateProvider(props: AppStateProviderProps) {
  const [store] = React.useState(() =>
    createStore({
      user: props.user,
      files: props.files,
      folders: props.folders,
    })
  );

  return (
    <AppStateContext.Provider value={store}>
      {props.children}
    </AppStateContext.Provider>
  );
}
