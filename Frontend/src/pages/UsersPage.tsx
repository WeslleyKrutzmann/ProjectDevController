import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ModalOverlay } from "../components/ModalOverlay";
import type { User } from "../lib/types";

const roleOptions = ["Administrator", "Developer", "Tester"];
const roleLabels: Record<string, string> = {
  Administrator: "Administrador",
  Developer: "Desenvolvedor",
  Tester: "Testador"
};

type UserUpdatePayload = {
  fullName: string;
  email: string;
  password: string | null;
  role: string | null;
  isActive: boolean | null;
};

export function UsersPage() {
  const { token, user, refreshMe, logout } = useAuth();
  const isAdmin = user?.role === "Administrator";

  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("Developer");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("Developer");
  const [editIsActive, setEditIsActive] = useState(true);

  async function loadUsers() {
    if (!token) {
      return;
    }

    const rows = await api.get<User[]>("/users", token);
    setUsers(rows);
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    loadUsers().catch(() => setUsers([]));
  }, [token]);

  function openEditModal(targetUser: User) {
    const canEdit = isAdmin || targetUser.id === user?.id;
    if (!canEdit) {
      return;
    }

    setError("");
    setEditingUser(targetUser);
    setEditFullName(targetUser.fullName);
    setEditEmail(targetUser.email);
    setEditPassword("");
    setEditRole(targetUser.role);
    setEditIsActive(targetUser.isActive);
  }

  function closeEditModal() {
    setEditingUser(null);
    setEditPassword("");
  }

  function openCreateModal() {
    if (!isAdmin) {
      return;
    }

    setError("");
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setNewFullName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("Developer");
  }

  async function createUser(event: FormEvent) {
    event.preventDefault();
    if (!token || !isAdmin) {
      return;
    }

    setError("");
    try {
      await api.post<User>("/users", { fullName: newFullName, email: newEmail, password: newPassword, role: newRole }, token);
      closeCreateModal();
      await loadUsers();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateUser(event: FormEvent) {
    event.preventDefault();
    if (!token || !editingUser) {
      return;
    }
    if (!isAdmin && editingUser.id !== user?.id) {
      return;
    }

    setError("");
    const payload: UserUpdatePayload = {
      fullName: editFullName,
      email: editEmail,
      password: editPassword.trim() ? editPassword : null,
      role: isAdmin ? editRole : null,
      isActive: isAdmin ? editIsActive : null
    };

    try {
      const updated = await api.put<User>(`/users/${editingUser.id}`, payload, token);

      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

      if (updated.id === user?.id) {
        if (!updated.isActive) {
          logout();
          return;
        }

        await refreshMe();
      }

      closeEditModal();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Usuários</h2>
        <button type="button" onClick={openCreateModal} disabled={!isAdmin} className="rounded bg-brand-700 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">
          Novo usuário
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Perfil</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{row.fullName}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{roleLabels[row.role] ?? row.role}</td>
                <td className="px-3 py-2">{row.isActive ? "Ativo" : "Inativo"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(row)}
                    disabled={!isAdmin && row.id !== user.id}
                    className="rounded bg-slate-800 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <ModalOverlay>
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar usuário</h3>
              <button type="button" onClick={closeEditModal} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Fechar
              </button>
            </div>

            <form onSubmit={updateUser} className="grid gap-2">
              <input value={editFullName} onChange={(event) => setEditFullName(event.target.value)} placeholder="Nome completo" className="rounded border border-slate-300 px-3 py-2" />
              <input value={editEmail} onChange={(event) => setEditEmail(event.target.value)} placeholder="Email" className="rounded border border-slate-300 px-3 py-2" />
              <input type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="Nova senha (opcional)" className="rounded border border-slate-300 px-3 py-2" />
              {isAdmin && (
                <select value={editRole} onChange={(event) => setEditRole(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
                  {roleOptions.map((opt) => (
                    <option key={opt} value={opt}>{roleLabels[opt] ?? opt}</option>
                  ))}
                </select>
              )}
              {isAdmin && (
                <label className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm">
                  <input type="checkbox" checked={editIsActive} onChange={(event) => setEditIsActive(event.target.checked)} />
                  Usuário ativo
                </label>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="rounded bg-brand-700 px-3 py-2 text-white">Salvar alterações</button>
            </form>
          </div>
        </ModalOverlay>
      )}

      {isAdmin && isCreateModalOpen && (
        <ModalOverlay>
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Criar usuário</h3>
              <button type="button" onClick={closeCreateModal} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Fechar
              </button>
            </div>

            <form onSubmit={createUser} className="grid gap-2 md:grid-cols-2">
              <input value={newFullName} onChange={(event) => setNewFullName(event.target.value)} placeholder="Nome completo" className="rounded border border-slate-300 px-3 py-2" />
              <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Email" className="rounded border border-slate-300 px-3 py-2" />
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Senha" className="rounded border border-slate-300 px-3 py-2" />
              <select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
                {roleOptions.map((opt) => (
                  <option key={opt} value={opt}>{roleLabels[opt] ?? opt}</option>
                ))}
              </select>
              {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
              <button className="rounded bg-brand-700 px-3 py-2 text-white md:col-span-2">Criar usuário</button>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
