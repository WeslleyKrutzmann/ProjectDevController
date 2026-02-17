import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Project, WorkItem } from "../lib/types";

export function DashboardPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (!token) {
      return;
    }

    api.get<Project[]>("/projects", token).then(setProjects).catch(() => setProjects([]));
    api.get<WorkItem[]>("/work-items", token).then(setWorkItems).catch(() => setWorkItems([]));
  }, [token]);

  const totalHours = workItems.reduce((sum, item) => sum + item.totalHours, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Projetos</p>
        <p className="text-3xl font-bold text-brand-700">{projects.length}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Tarefas</p>
        <p className="text-3xl font-bold text-brand-700">{workItems.length}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Horas registradas</p>
        <p className="text-3xl font-bold text-brand-700">{totalHours.toFixed(2)}h</p>
      </div>
    </div>
  );
}
