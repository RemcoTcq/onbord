"use client";

import { createContext, useContext } from "react";

// Ce que le cadre du tableau de bord partage avec les pages : l'utilisateur
// (pour l'avatar de l'en-tête) et la liste légère de ses jobs (menu, recherche).
// `refreshJobs` sert aux pages qui créent, renomment ou suppriment un job.
const ShellContext = createContext({
  user: null,
  jobs: [],
  refreshJobs: () => {},
  openSearch: () => {},
});

export const ShellProvider = ShellContext.Provider;

export function useShell() {
  return useContext(ShellContext);
}
