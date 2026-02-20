import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const roleLabels: Record<string, string> = {
  Administrator: "Administrador",
  Developer: "Desenvolvedor",
  Tester: "Testador"
};

const menu = [
  { to: "/", label: "Painel" },
  { to: "/projects", label: "Projetos" },
  { to: "/work-items", label: "Tarefas" },
  { to: "/reports", label: "Relatórios" },
  { to: "/users", label: "Usuários" }
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-brand-700">ProjectDevController - {__APP_VERSION__}</h1>
            <p className="text-sm text-slate-500">Gerenciador de projetos</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-slate-500">{user?.role ? (roleLabels[user.role] ?? user.role) : ""}</p>
            <div className="mt-1 inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`rounded border p-1.5 ${theme === "light" ? "border-brand-700 text-brand-700" : "border-slate-300 text-slate-500"}`}
                aria-label="Ativar tema claro"
                title="Tema claro"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M12 4a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 12.8a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v-1.2a1 1 0 0 1 1-1Zm8-4.8a1 1 0 0 1-1 1h-1.2a1 1 0 1 1 0-2H19a1 1 0 0 1 1 1Zm-12.8 0a1 1 0 0 1-1 1H5a1 1 0 1 1 0-2h1.2a1 1 0 0 1 1 1Zm9.05-5.66a1 1 0 0 1 1.41 0l.85.85a1 1 0 1 1-1.41 1.41l-.85-.85a1 1 0 0 1 0-1.41Zm-9.36 9.36a1 1 0 0 1 1.41 0l.85.85a1 1 0 0 1-1.41 1.41l-.85-.85a1 1 0 0 1 0-1.41Zm10.21 1.41a1 1 0 0 1 0-1.41l.85-.85a1 1 0 1 1 1.41 1.41l-.85.85a1 1 0 0 1-1.41 0ZM7.74 7.74a1 1 0 0 1 0-1.41l.85-.85A1 1 0 1 1 10 6.9l-.85.85a1 1 0 0 1-1.41 0ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`rounded border p-1.5 ${theme === "dark" ? "border-brand-700 text-brand-700" : "border-slate-300 text-slate-500"}`}
                aria-label="Ativar tema escuro"
                title="Tema escuro"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a1 1 0 0 1 1.08 1.35A6.5 6.5 0 1 0 19.65 11.7 1 1 0 0 1 21 12.8Z" />
                </svg>
              </button>
              <button onClick={logout} className="rounded bg-slate-800 px-3 py-1 text-xs text-white">
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <nav className="space-y-2">
            {menu.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block rounded px-3 py-2 text-sm ${
                    active
                      ? "bg-brand-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
