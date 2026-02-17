import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Project } from "../lib/types";

export function ProjectsPage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    if (!token) {
      return;
    }

    const rows = await api.get<Project[]>("/projects", token);
    setProjects(rows);
  }

  useEffect(() => {
    load().catch(() => setProjects([]));
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    await api.post<Project>("/projects", { name, description }, token);
    setName("");
    setDescription("");
    await load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Projetos</h2>

      {user?.role === "Administrator" && (
        <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Criar projeto</h3>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do projeto"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button className="rounded bg-brand-700 px-3 py-2 text-white">Salvar</button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left">Tarefas</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-semibold">{project.name}</td>
                <td className="px-3 py-2">{project.description}</td>
                <td className="px-3 py-2">{project.taskCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
