import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { formatHours } from "../lib/hours";
import type { HoursByUserReportRow } from "../lib/types";

const roleLabels: Record<string, string> = {
  Administrator: "Administrador",
  Developer: "Desenvolvedor",
  Tester: "Testador"
};

export function ReportsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<HoursByUserReportRow[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function load() {
    if (!token) {
      return;
    }

    const params = new URLSearchParams();
    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }

    const query = params.toString();
    const data = await api.get<HoursByUserReportRow[]>(`/reports/hours-by-user${query ? `?${query}` : ""}`, token);
    setRows(data);
  }

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Horas por usuário</h2>
      <form onSubmit={onSubmit} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded border border-slate-300 px-3 py-2" />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded border border-slate-300 px-3 py-2" />
        <button className="rounded bg-brand-700 px-3 py-2 text-white">Aplicar filtro</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Perfil</th>
              <th className="px-3 py-2 text-left">Total de horas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId} className="border-t border-slate-200">
                <td className="px-3 py-2">{row.userName}</td>
                <td className="px-3 py-2">{roleLabels[row.role] ?? row.role}</td>
                <td className="px-3 py-2 font-semibold">{formatHours(row.totalHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
