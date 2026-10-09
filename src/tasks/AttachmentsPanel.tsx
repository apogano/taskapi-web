import { useRef, useState } from "react";
import {
  ApiError,
  MAX_ATTACHMENT_BYTES,
  openAttachment,
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from "./attachments";

export function AttachmentsPanel({ taskId }: { taskId: string }) {
  const { data, isPending, isError } = useAttachments(taskId);
  const upload = useUploadAttachment(taskId);
  const remove = useDeleteAttachment(taskId);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("Files can be at most 25 MB.");
      return;
    }
    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onError: (e) =>
          setError(e instanceof ApiError && e.status === 413 ? "That file is too large." : "Upload failed."),
        onSettled: () => {
          setProgress(null);
          if (inputRef.current) inputRef.current.value = ""; // allow picking the same file again
        },
      },
    );
  }

  function handleOpen(attachmentId: string) {
    openAttachment(taskId, attachmentId).catch(() => setError("Could not open the file."));
  }

  return (
    <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3">
      {isPending ? (
        <p className="text-xs text-gray-500">Loading files…</p>
      ) : isError ? (
        <p className="text-xs text-red-600">Could not load files.</p>
      ) : data.items.length === 0 ? (
        <p className="text-xs text-gray-500">No files yet.</p>
      ) : (
        <ul className="space-y-1">
          {data.items.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-2 text-sm">
              <button
                onClick={() => handleOpen(attachment.id)}
                className="min-w-0 cursor-pointer truncate text-blue-600 hover:underline"
              >
                {attachment.filename}
              </button>
              <button
                onClick={() => remove.mutate(attachment.id)}
                disabled={remove.isPending}
                className="shrink-0 cursor-pointer text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {progress !== null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
          {/* A runtime value can't be a Tailwind class: classes are generated
              at build time from the source, so the width goes in style */}
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      ) : (
        <label className="inline-block cursor-pointer text-sm font-medium text-blue-600 hover:underline">
          Attach a file
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      )}

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}