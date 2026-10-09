import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthProvider.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { listenForRemoteChanges } from "./api/sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data fetched less than 30s ago is used as-is, without refetching.
      // Our own changes still refresh it immediately via invalidateQueries.
      staleTime: 30_000,
    },
  },
});
listenForRemoteChanges(queryClient);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);