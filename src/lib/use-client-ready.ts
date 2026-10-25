"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
// Keep server-rendered controls disabled until their event handlers are ready.
export function useClientReady() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
