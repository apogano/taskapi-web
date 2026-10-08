import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button, TextField } from "../components/ui";

const ERROR_MESSAGES: Record<number, string> = {
  401: "Wrong email or password.",
  409: "An account with this email already exists.",
  422: "Check the email address, and use a password of at least 8 characters.",
  429: "Too many attempts. Please wait a few minutes and try again.",
};

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const action = mode === "login" ? login : register;
      const result = await action(email, password);
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.status] ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

 return (
  <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isLogin ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-sm text-gray-500">Task API</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={isLogin ? undefined : 8}
          required
        />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(isLogin ? "register" : "login");
          setError(null);
        }}
        className="w-full cursor-pointer text-sm text-blue-600 hover:underline"
      >
        {isLogin ? "No account? Create one" : "Already have an account? Sign in"}
      </button>
    </div>
  </main>
);
}