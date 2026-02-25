import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { formatHours } from "../lib/hours";
import type { HoursByUserReportRow, Project, User, WorkItem } from "../lib/types";

type UserHoursChartRow = {
  userId: string;
  userName: string;
  totalHours: number;
};

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultEndDate(): string {
  return toDateInputValue(new Date());
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return toDateInputValue(date);
}

function getNiceChartMax(value: number): number {
  if (value <= 0) {
    return 1;
  }

  if (value <= 1) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function buildUsersWithHours(users: User[], reportRows: HoursByUserReportRow[]): UserHoursChartRow[] {
  const reportMap = new Map(reportRows.map((row) => [row.userId, row.totalHours]));

  if (users.length === 0) {
    return [...reportRows]
      .map((row) => ({ userId: row.userId, userName: row.userName, totalHours: row.totalHours }))
      .sort((a, b) => a.userName.localeCompare(b.userName, "pt-BR"));
  }

  return [...users]
    .map((user) => ({
      userId: user.id,
      userName: user.fullName,
      totalHours: reportMap.get(user.id) ?? 0
    }))
    .sort((a, b) => a.userName.localeCompare(b.userName, "pt-BR"));
}

export function DashboardPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hoursByUser, setHoursByUser] = useState<HoursByUserReportRow[]>([]);
  const [startDate, setStartDate] = useState(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState(() => getDefaultEndDate());

  const totalHours = workItems.reduce((sum, item) => sum + item.totalHours, 0);

  const usersWithHours = useMemo(
    () => buildUsersWithHours(users, hoursByUser),
    [users, hoursByUser]
  );

  const chartMaxHours = useMemo(
    () => getNiceChartMax(Math.max(...usersWithHours.map((row) => row.totalHours), 0)),
    [usersWithHours]
  );

  const chartTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => (chartMaxHours / 4) * (4 - index)),
    [chartMaxHours]
  );

  async function loadHoursByUserReport() {
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
    const rows = await api.get<HoursByUserReportRow[]>(`/reports/hours-by-user${query ? `?${query}` : ""}`, token);
    setHoursByUser(rows);
  }

  async function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
    await loadHoursByUserReport();
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    api.get<Project[]>("/projects", token).then(setProjects).catch(() => setProjects([]));
    api.get<WorkItem[]>("/work-items", token).then(setWorkItems).catch(() => setWorkItems([]));
    api.get<User[]>("/users", token).then(setUsers).catch(() => setUsers([]));
    loadHoursByUserReport().catch(() => setHoursByUser([]));
  }, [token]);

  const marginLeft = 68;
  const marginRight = 16;
  const marginTop = 12;
  const marginBottom = 104;
  const plotHeight = 260;
  const minPlotWidth = 520;
  const slotWidth = 64;
  const plotWidth = Math.max(minPlotWidth, usersWithHours.length * slotWidth);
  const svgWidth = marginLeft + plotWidth + marginRight;
  const svgHeight = marginTop + plotHeight + marginBottom;
  const barWidth = Math.min(38, Math.max(16, slotWidth * 0.55));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Projetos</p>
          <p className="text-3xl font-bold text-brand-700">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total de tarefas</p>
          <p className="text-3xl font-bold text-brand-700">{workItems.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total horas registradas</p>
          <p className="text-3xl font-bold text-brand-700">{formatHours(totalHours)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Horas trabalhadas por usuario</h3>
            <p className="text-sm text-slate-500">Periodo padrao: ultimos 30 dias</p>
          </div>
          <form onSubmit={onFilterSubmit} className="grid gap-2 sm:grid-cols-3">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded bg-brand-700 px-3 py-2 text-sm text-white">Aplicar</button>
          </form>
        </div>

        {usersWithHours.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-[360px] w-full min-w-[720px]"
                role="img"
                aria-label="Grafico de barras de horas por usuario"
              >
                {chartTicks.map((tickValue, tickIndex) => {
                  const ratio = chartMaxHours === 0 ? 0 : tickValue / chartMaxHours;
                  const y = marginTop + plotHeight - ratio * plotHeight;
                  return (
                    <g key={`tick-${tickIndex}`}>
                      <line
                        x1={marginLeft}
                        y1={y}
                        x2={marginLeft + plotWidth}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      <text x={marginLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                        {formatHours(tickValue)}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={marginLeft}
                  y1={marginTop}
                  x2={marginLeft}
                  y2={marginTop + plotHeight}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <line
                  x1={marginLeft}
                  y1={marginTop + plotHeight}
                  x2={marginLeft + plotWidth}
                  y2={marginTop + plotHeight}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />

                {usersWithHours.map((row, index) => {
                  const x = marginLeft + index * slotWidth + (slotWidth - barWidth) / 2;
                  const barHeight = chartMaxHours > 0 ? (row.totalHours / chartMaxHours) * plotHeight : 0;
                  const y = marginTop + plotHeight - barHeight;
                  const centerX = x + barWidth / 2;
                  const labelY = marginTop + plotHeight + 16;
                  const displayedHeight = row.totalHours > 0 ? Math.max(barHeight, 1) : 1;
                  const valueLabel = row.totalHours > 0 ? formatHours(row.totalHours) : "0h";

                  return (
                    <g key={row.userId}>
                      <rect
                        x={x}
                        y={row.totalHours > 0 ? y : marginTop + plotHeight - 1}
                        width={barWidth}
                        height={displayedHeight}
                        rx="4"
                        fill={row.totalHours > 0 ? "#1d4ed8" : "#cbd5e1"}
                      >
                        <title>{`${row.userName}: ${valueLabel}`}</title>
                      </rect>
                      <text
                        x={centerX}
                        y={Math.max((row.totalHours > 0 ? y : marginTop + plotHeight) - 6, marginTop + 10)}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#334155"
                      >
                        {valueLabel}
                      </text>
                      <text
                        x={centerX}
                        y={labelY}
                        textAnchor="start"
                        fontSize="11"
                        fill="#475569"
                        transform={`rotate(38 ${centerX} ${labelY})`}
                      >
                        {row.userName}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={24}
                  y={marginTop + plotHeight / 2}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#475569"
                  transform={`rotate(-90 24 ${marginTop + plotHeight / 2})`}
                >
                  Horas trabalhadas
                </text>
                <text
                  x={marginLeft + plotWidth / 2}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#475569"
                >
                  Usuarios
                </text>
              </svg>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {usersWithHours.map((row) => (
                <div
                  key={`summary-${row.userId}`}
                  className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="truncate pr-3 text-slate-700" title={row.userName}>
                    {row.userName}
                  </span>
                  <span className="font-semibold text-slate-800">{formatHours(row.totalHours)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
            Nenhum usuario encontrado para montar o grafico.
          </p>
        )}
      </div>
    </div>
  );
}
