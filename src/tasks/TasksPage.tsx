import { useState, type FormEvent } from "react";
import { Button, TextField } from "../components/ui";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask, type Task } from "./queries";
import { AttachmentsPanel } from "./AttachmentsPanel";

const PAGE_SIZE = 10;

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Open", value: false },
  { label: "Done", value: true },
] as const;

export function TasksPage() {
  const [done, setDone] = useState<boolean | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const { data, isPending, isError, isPlaceholderData } = useTasks({
    done,
    limit: PAGE_SIZE,
    offset,
  });
  const deleteTask = useDeleteTask();

  function changeFilter(value: boolean | undefined) {
    setDone(value);
    setOffset(0); // a new filter starts from its first page
  }


  function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const wasLastOnPage = data?.items.length === 1;
    deleteTask.mutate(task.id, {
      // Deleting the only task on a page would leave it empty: step back one
      onSuccess: () => {
        if (wasLastOnPage && offset > 0) setOffset(offset - PAGE_SIZE);
      },
    });
  }  

  return (
    <div className="space-y-6">
      <NewTaskForm />

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => changeFilter(filter.value)}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors ${
              done === filter.value
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="text-sm text-gray-500">Loading tasks…</p>
      ) : isError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not load tasks.
        </p>
      ) : data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No tasks here yet.</p>
      ) : (
        <>
          {/* Dimmed while the next page loads behind the current one */}
          <ul
            className={`divide-y divide-gray-200 rounded-lg bg-white ring-1 ring-gray-200 ${
              isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            {data.items.map((task) => (
              <TaskRow key={task.id} task={task} onDelete={handleDelete} />
            ))}
          </ul>
          <Pagination
            offset={offset}
            total={data.total}
            onChange={setOffset}
            disabled={isPlaceholderData}
          />
        </>
      )}
    </div>
  );
}

function TaskRow({ task, onDelete }: { task: Task; onDelete: (task: Task) => void }) {
  const [editing, setEditing] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const updateTask = useUpdateTask();

  if (editing) {
    return <TaskEditor task={task} onClose={() => setEditing(false)} />;
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => updateTask.mutate({ id: task.id, changes: { done: e.target.checked } })}
        aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className="mt-1 size-4 cursor-pointer accent-blue-600"
      />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${task.done ? "text-gray-400 line-through" : "text-gray-900"}`}>
          {task.title}
        </p>
        {task.description && <p className="mt-0.5 text-sm text-gray-500">{task.description}</p>}
        {updateTask.isError && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            Couldn't save that change. Please try again.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <time dateTime={task.created_at} className="text-xs text-gray-400">
          {new Date(task.created_at).toLocaleDateString()}
        </time>
        <button
            onClick={() => setShowFiles(!showFiles)}
            aria-expanded={showFiles}
            className="cursor-pointer text-gray-500 hover:text-gray-900"
          >
            Files
        </button>
        <button onClick={() => setEditing(true)} className="cursor-pointer text-gray-500 hover:text-gray-900">
          Edit
        </button>
        <button onClick={() => onDelete(task)} className="cursor-pointer text-red-600 hover:text-red-800">
          Delete
        </button>
      </div>
      </div>
       {showFiles && <AttachmentsPanel taskId={task.id} />}
    </li>
  );
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const updateTask = useUpdateTask();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateTask.mutate(
      // An emptied description is sent as null, which clears it
      { id: task.id, changes: { title: title.trim(), description: description.trim() || null } },
      { onSuccess: onClose },
    );
  }

  return (
    <li className="px-4 py-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        <div className="space-y-1">
          <label htmlFor={`description-${task.id}`} className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id={`description-${task.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs
              focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
          />
        </div>
        {updateTask.isError && (
          <p role="alert" className="text-sm text-red-600">Couldn't save. Please try again.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={updateTask.isPending || !title.trim()}>Save</Button>
        </div>
      </form>
    </li>
  );
}

function Pagination({
  offset,
  total,
  onChange,
  disabled,
}: {
  offset: number;
  total: number;
  onChange: (offset: number) => void;
  disabled: boolean;
}) {
  const from = offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={disabled || offset === 0}
          onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={disabled || to >= total}
          onClick={() => onChange(offset + PAGE_SIZE)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function NewTaskForm() {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTask.mutate({ title: title.trim() }, { onSuccess: () => setTitle("") });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <TextField
          label="New task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>
      <Button type="submit" disabled={createTask.isPending || !title.trim()}>
        Add
      </Button>
    </form>
  );
}