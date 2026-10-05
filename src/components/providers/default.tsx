import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { AuthProvider } from "./auth.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { StorageProvider } from "./storage";
import { SyncProvider } from "./sync.tsx";
import { ThemeProvider } from "./theme.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <StorageProvider>
      <AuthProvider>
        <SyncProvider>
          <QueryClientProvider>
            <TooltipProvider>
              <ThemeProvider>
                <Toaster />
                {children}
              </ThemeProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </SyncProvider>
      </AuthProvider>
    </StorageProvider>
  );
}
