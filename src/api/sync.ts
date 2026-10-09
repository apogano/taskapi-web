import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Separate from the auth channel: this one only carries "data changed" signals
const channel = new BroadcastChannel("taskapi-data");

type SyncMessage = { type: "invalidate"; queryKey: QueryKey };

export function listenForRemoteChanges(queryClient: QueryClient): void {
  channel.addEventListener("message", (event: MessageEvent<SyncMessage>) => {
    if (event.data.type === "invalidate") {
      queryClient.invalidateQueries({ queryKey: event.data.queryKey });
    }
  });
}

// Use this after every mutation instead of invalidateQueries directly,
// so other tabs can never be forgotten.
export function invalidateEverywhere(queryClient: QueryClient, queryKey: QueryKey): Promise<void> {
  channel.postMessage({ type: "invalidate", queryKey } satisfies SyncMessage);
  return queryClient.invalidateQueries({ queryKey });
}