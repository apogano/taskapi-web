import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "../api/client";
import type { components, paths } from "../api/schema";
import { invalidateEverywhere } from "../api/sync";

export type Task = components["schemas"]["TaskRead"];
export type TaskCreate = components["schemas"]["TaskCreate"];

export type TaskListParams = {
  done?: boolean;
  limit: number;
  offset: number;
};

export type TaskUpdate = components["schemas"]["TaskUpdate"];
type TaskPage = paths["/tasks"]["get"]["responses"][200]["content"]["application/json"];
type Snapshot = { snapshot: [QueryKey, TaskPage | undefined][] };


export function useTasks(params: TaskListParams) {
  return useQuery({
    // The params are part of the key: each page/filter combination is
    // cached separately, and changing them triggers a fetch automatically
    queryKey: ["tasks", params],
    queryFn: async () => {
      const { data, response } = await api.GET("/tasks", { params: { query: params } });
      if (!data) throw new Error(`Failed to load tasks (${response.status})`);
      return data;
    },
    // Keep showing the current page while the next one loads, instead of
    // flashing an empty list
    placeholderData: keepPreviousData,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TaskCreate) => {
      const { data, response } = await api.POST("/tasks", { body });
      if (!data) throw new Error(`Failed to create task (${response.status})`);
      return data;
    },
    // Every cached task list may now be stale, whatever its page or filter
    onSuccess: () => invalidateEverywhere(queryClient, ["tasks"]),
  });
}


// Applies a change to every cached task list (all pages, all filters) and
// returns a snapshot to restore if the request fails.
async function optimisticallyUpdate(
  queryClient: QueryClient,
  update: (page: TaskPage) => TaskPage,
): Promise<Snapshot> {
  // A fetch already in flight could land after this and overwrite the change
  await queryClient.cancelQueries({ queryKey: ["tasks"] });
  const snapshot = queryClient.getQueriesData<TaskPage>({ queryKey: ["tasks"] });
  queryClient.setQueriesData<TaskPage>({ queryKey: ["tasks"] }, (page) => page && update(page));
  return { snapshot };
}

function rollback(queryClient: QueryClient, context: Snapshot | undefined) {
  context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: TaskUpdate }) => {
      const { data, response } = await api.PATCH("/tasks/{task_uuid}", {
        params: { path: { task_uuid: id } },
        body: changes,
      });
      if (!data) throw new Error(`Failed to update task (${response.status})`);
      return data;
    },
    onMutate: ({ id, changes }) =>
      optimisticallyUpdate(queryClient, (page) => ({
        ...page,
        items: page.items.map((task) => (task.id === id ? { ...task, ...changes } : task)),
      })),
    onError: (_error, _variables, context) => rollback(queryClient, context),
    // Whatever happened, re-sync with the server so the cache ends up true
    onSettled: () => invalidateEverywhere(queryClient, ["tasks"]),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE("/tasks/{task_uuid}", {
        params: { path: { task_uuid: id } },
      });
      if (!response.ok) throw new Error(`Failed to delete task (${response.status})`);
    },
    onMutate: (id) =>
      optimisticallyUpdate(queryClient, (page) => {
        const items = page.items.filter((task) => task.id !== id);
        return items.length === page.items.length ? page : { ...page, items, total: page.total - 1 };
      }),
    onError: (_error, _variables, context) => rollback(queryClient, context),
    onSettled: () => invalidateEverywhere(queryClient, ["tasks"]),
  });
}
