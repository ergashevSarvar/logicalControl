import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "@/providers/auth-provider";
import { PaletteProvider } from "@/providers/palette-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 20_000,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaletteProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </PaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
