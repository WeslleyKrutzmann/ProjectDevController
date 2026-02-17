import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-brand-700">ProjectDevController</h1>
            <p className="text-sm text-slate-500">Gerenciador de projetos</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-slate-500">{user?.role ? (roleLabels[user.role] ?? user.role) : ""}</p>
            <button onClick={logout} className="mt-1 rounded bg-slate-800 px-3 py-1 text-xs text-white">
              Sair
            </button>
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
                    active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
