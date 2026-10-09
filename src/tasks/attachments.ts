import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { components } from "../api/schema";
import { invalidateEverywhere } from "../api/sync";

export type Attachment = components["schemas"]["AttachmentRead"];

// Mirrors ATTACHMENT_MAX_SIZE_MB on the backend, which remains the real check
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Not under ["tasks", ...]: the optimistic task updates rewrite every cache
// entry whose key starts with "tasks", and attachments must not be among them
const attachmentsKey = (taskId: string) => ["attachments", taskId];

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: attachmentsKey(taskId),
    queryFn: async () => {
      const { data, response } = await api.GET("/tasks/{task_id}/attachments", {
        params: { path: { task_id: taskId } },
      });
      if (!data) throw new ApiError(response.status, "Failed to load attachments");
      return data;
    },
  });
}

// fetch() can't report upload progress; XMLHttpRequest can
function putToSignedUrl(
  url: string,
  file: File,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Must match the content type the URL was signed for, or storage rejects it
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, "Upload to storage failed"));
    xhr.onerror = () => reject(new Error("Upload to storage failed"));
    xhr.send(file);
  });
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress: (fraction: number) => void }) => {
      const contentType = file.type || "application/octet-stream";

      // 1. Ask the API for a signed upload URL
      const created = await api.POST("/tasks/{task_id}/attachments", {
        params: { path: { task_id: taskId } },
        body: { filename: file.name, content_type: contentType },
      });
      if (!created.data) throw new ApiError(created.response.status, "Could not start upload");
      const { attachment, upload_url } = created.data;

      // 2. Upload straight to Cloud Storage, bypassing our API entirely
      await putToSignedUrl(upload_url, file, contentType, onProgress);

      // 3. Tell the API it's there; it checks the real size before accepting it
      const confirmed = await api.POST("/tasks/{task_id}/attachments/{attachment_id}/confirm", {
        params: { path: { task_id: taskId, attachment_id: attachment.id } },
      });
      if (!confirmed.data) throw new ApiError(confirmed.response.status, "Could not confirm upload");
      return confirmed.data;
    },
    onSuccess: () => invalidateEverywhere(queryClient, attachmentsKey(taskId)),
  });
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { response } = await api.DELETE("/tasks/{task_id}/attachments/{attachment_id}", {
        params: { path: { task_id: taskId, attachment_id: attachmentId } },
      });
      if (!response.ok) throw new ApiError(response.status, "Failed to delete attachment");
    },
    onSuccess: () => invalidateEverywhere(queryClient, attachmentsKey(taskId)),
  });
}

export async function openAttachment(taskId: string, attachmentId: string): Promise<void> {
  // Opened synchronously, inside the click, so popup blockers allow it.
  // It is pointed at the file once the signed URL arrives.
  const tab = window.open("", "_blank");
  const { data } = await api.GET("/tasks/{task_id}/attachments/{attachment_id}/download-url", {
    params: { path: { task_id: taskId, attachment_id: attachmentId } },
  });
  if (!data) {
    tab?.close();
    throw new Error("Failed to get download link");
  }
  if (tab) {
    tab.opener = null; // the opened page gets no handle back to this one
    tab.location.href = data.download_url;
  } else {
    window.location.assign(data.download_url);
  }
}