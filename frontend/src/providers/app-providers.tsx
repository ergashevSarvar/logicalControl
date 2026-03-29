import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

function AppToastContainer() {
  const { resolvedTheme } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={2800}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastClassName="app-toast"
      progressClassName="app-toast-progress"
    />
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaletteProvider>
          <AuthProvider>
            {children}
            <AppToastContainer />
          </AuthProvider>
        </PaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
