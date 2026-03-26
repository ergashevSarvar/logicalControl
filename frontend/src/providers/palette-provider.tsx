import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import type { PaletteName } from "@/lib/types";

type PaletteContextValue = {
  palette: PaletteName;
  setPalette: (palette: PaletteName) => void;
};

const paletteKey = "logical-control.palette";
const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: PropsWithChildren) {
  const [palette, setPalette] = useState<PaletteName>(() => {
    const stored = window.localStorage.getItem(paletteKey) as PaletteName | null;
    return stored ?? "ocean";
  });

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    window.localStorage.setItem(paletteKey, palette);
  }, [palette]);

  return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const context = useContext(PaletteContext);
  if (!context) {
    throw new Error("usePalette must be used inside PaletteProvider");
  }

  return context;
}
