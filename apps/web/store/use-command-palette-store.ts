import { create } from "zustand";

interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/**
 * Estado compartido del Command Palette (Cmd+K): permite que tanto el propio
 * componente como el botón "Buscar expediente…" de la topbar abran/cierren
 * el mismo modal sin acoplarlos por props.
 */
export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
