import { useAuth } from "./auth/AuthContext";
import { Button } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";

export default function App() {
  const { state, logout } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading…
      </div>
    );
  }
  if (state.status === "anonymous") return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-semibold text-gray-900">Task API</span>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{state.user.email}</span>
            <Button variant="secondary" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Tasks go here */}
      </main>
    </div>
  );
}