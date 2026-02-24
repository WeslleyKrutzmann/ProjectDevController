import { DragEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ModalOverlay } from "../components/ModalOverlay";
import type { Project, TaskComment, TimeEntry, User, WorkItem, WorkItemStatus } from "../lib/types";

const statuses: WorkItemStatus[] = ["Todo", "InProgress", "InTesting", "Done"];
const statusLabels: Record<WorkItemStatus, string> = {
  Todo: "A fazer",
  InProgress: "Em andamento",
  InTesting: "Em teste",
  Done: "Concluída"
};
const roleLabels: Record<string, string> = {
  Administrator: "Administrador",
  Developer: "Desenvolvedor",
  Tester: "Testador"
};
type DescriptionTab = "edit" | "preview";
type WorkItemsViewMode = "list" | "kanban";
type ActivityItem = {
  id: string;
  createdAtUtc: string;
  userName: string;
  content: string;
  hours: number | null;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function toDateTimeLocalInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function createDefaultLogPeriod(): { startAt: string; endAt: string } {
  const startAtDate = new Date();
  startAtDate.setSeconds(0, 0);
  const endAtDate = new Date(startAtDate.getTime() + 60 * 60 * 1000);
  return {
    startAt: toDateTimeLocalInput(startAtDate),
    endAt: toDateTimeLocalInput(endAtDate)
  };
}

function calculateWorkedHours(startAt: string, endAt: string): number | null {
  if (!startAt || !endAt) {
    return null;
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const diffInMilliseconds = endDate.getTime() - startDate.getTime();
  if (diffInMilliseconds <= 0) {
    return null;
  }

  const hours = diffInMilliseconds / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-text-${partIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-strong-${partIndex++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-code-${partIndex++}`} className="rounded bg-slate-100 px-1 py-0.5 text-xs">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const splitIndex = token.indexOf("](");
      const label = token.slice(1, splitIndex);
      const href = token.slice(splitIndex + 2, -1);
      nodes.push(
        <a
          key={`${keyPrefix}-link-${partIndex++}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-brand-700 underline"
        >
          {label}
        </a>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={`${keyPrefix}-em-${partIndex++}`}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-text-${partIndex++}`}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

function renderMarkdownPreview(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const output: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i++;
      }

      output.push(
        <pre key={`md-${key++}`} className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizeClass =
        level === 1 ? "text-2xl" :
        level === 2 ? "text-xl" :
        level === 3 ? "text-lg" :
        "text-base";
      output.push(
        <p key={`md-${key++}`} className={`font-semibold ${sizeClass}`}>
          {renderInlineMarkdown(text, `md-inline-${key}`)}
        </p>
      );
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(
          <li key={`md-li-${key++}`}>
            {renderInlineMarkdown(lines[i].replace(/^[-*]\s+/, ""), `md-inline-${key}`)}
          </li>
        );
        i++;
      }
      output.push(<ul key={`md-${key++}`} className="list-inside list-disc space-y-1">{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          <li key={`md-ol-li-${key++}`}>
            {renderInlineMarkdown(lines[i].replace(/^\d+\.\s+/, ""), `md-inline-${key}`)}
          </li>
        );
        i++;
      }
      output.push(<ol key={`md-${key++}`} className="list-inside list-decimal space-y-1">{items}</ol>);
      continue;
    }

    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s+/, ""));
        i++;
      }
      output.push(
        <blockquote key={`md-${key++}`} className="border-l-4 border-slate-300 pl-3 text-slate-700">
          {quoteLines.map((quoteLine, idx) => (
            <p key={`md-quote-${key}-${idx}`}>{renderInlineMarkdown(quoteLine, `md-inline-${key}-${idx}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("```")) {
      if (/^(#{1,6})\s+/.test(lines[i]) || /^[-*]\s+/.test(lines[i]) || /^\d+\.\s+/.test(lines[i]) || /^>\s+/.test(lines[i])) {
        break;
      }
      paragraphLines.push(lines[i]);
      i++;
    }

    const paragraphText = paragraphLines.join(" ");
    output.push(
      <p key={`md-${key++}`} className="leading-7 text-slate-800">
        {renderInlineMarkdown(paragraphText, `md-inline-${key}`)}
      </p>
    );
  }

  return output;
}

export function WorkItemsPage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionTab, setDescriptionTab] = useState<DescriptionTab>("edit");
  const [status, setStatus] = useState<WorkItemStatus>("Todo");
  const [responsibleDeveloperId, setResponsibleDeveloperId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  const [filterAssignedToId, setFilterAssignedToId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [isAssignedFilterInitialized, setIsAssignedFilterInitialized] = useState(false);

  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [logDescription, setLogDescription] = useState("");
  const [logStartAt, setLogStartAt] = useState("");
  const [logEndAt, setLogEndAt] = useState("");
  const [logWorkError, setLogWorkError] = useState("");
  const [logStatus, setLogStatus] = useState<WorkItemStatus>("Todo");
  const [logAssignedToId, setLogAssignedToId] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateAttempted, setIsCreateAttempted] = useState(false);
  const [viewMode, setViewMode] = useState<WorkItemsViewMode>("list");
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState("");

  const developerOptions = useMemo(
    () => users.filter((x) => x.role === "Developer" || x.role === "Administrator"),
    [users]
  );
  const itemsByStatus = useMemo(
    () =>
      statuses.reduce<Record<WorkItemStatus, WorkItem[]>>(
        (acc, currentStatus) => {
          acc[currentStatus] = items.filter((item) => item.status === currentStatus);
          return acc;
        },
        { Todo: [], InProgress: [], InTesting: [], Done: [] }
      ),
    [items]
  );
  const activityItems = useMemo<ActivityItem[]>(
    () => {
      const availableComments = comments.map((comment) => ({
        comment,
        used: false
      }));

      const mergedFromTimeEntries: ActivityItem[] = timeEntries.map((entry) => {
        const entryCreatedAt = new Date(entry.createdAtUtc).getTime();
        const entryContent = normalizeText(entry.description);

        const matchingComment = availableComments.find((candidate) => {
          if (candidate.used) {
            return false;
          }

          const sameUser = candidate.comment.authorName === entry.userName;
          const sameContent = normalizeText(candidate.comment.content) === entryContent;
          const commentCreatedAt = new Date(candidate.comment.createdAtUtc).getTime();
          const closeInTime = Math.abs(commentCreatedAt - entryCreatedAt) <= 2 * 60 * 1000;
          return sameUser && sameContent && closeInTime;
        });

        if (matchingComment) {
          matchingComment.used = true;
        }

        return {
          id: `time-${entry.id}`,
          createdAtUtc: entry.createdAtUtc,
          userName: entry.userName,
          content: matchingComment?.comment.content ?? entry.description,
          hours: entry.hours
        };
      });

      const commentOnlyItems: ActivityItem[] = availableComments
        .filter((candidate) => !candidate.used)
        .map((candidate) => ({
          id: `comment-${candidate.comment.id}`,
          createdAtUtc: candidate.comment.createdAtUtc,
          userName: candidate.comment.authorName,
          content: candidate.comment.content,
          hours: null
        }));

      return [...mergedFromTimeEntries, ...commentOnlyItems].sort(
        (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
      );
    },
    [comments, timeEntries]
  );
  const calculatedLogHours = useMemo(
    () => calculateWorkedHours(logStartAt, logEndAt),
    [logStartAt, logEndAt]
  );

  async function loadMeta() {
    if (!token) {
      return;
    }

    const [projectRows, userRows] = await Promise.all([
      api.get<Project[]>("/projects", token),
      api.get<User[]>("/users/assignable", token).catch(() => [])
    ]);

    setProjects(projectRows);
    setUsers(userRows);
    if (!projectId && projectRows.length > 0) {
      setProjectId(projectRows[0].id);
    }
  }

  async function loadItems() {
    if (!token) {
      return;
    }

    const params = new URLSearchParams();
    if (filterProjectId) {
      params.set("projectId", filterProjectId);
    }
    if (filterAssignedToId) {
      params.set("assignedToId", filterAssignedToId);
    }
    if (filterStatus) {
      params.set("status", filterStatus);
    }

    const query = params.toString();
    const rows = await api.get<WorkItem[]>(`/work-items${query ? `?${query}` : ""}`, token);
    const filteredRows = filterAssignedToId
      ? rows.filter((item) => item.assignedToId === filterAssignedToId)
      : rows;
    setItems(filteredRows);
  }

  useEffect(() => {
    if (!user || isAssignedFilterInitialized) {
      return;
    }

    setFilterAssignedToId(user.role === "Administrator" ? "" : user.id);
    setIsAssignedFilterInitialized(true);
  }, [user, isAssignedFilterInitialized]);

  useEffect(() => {
    loadMeta().catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const shouldWaitUserContext = !user;
    const shouldWaitAssignedFilter = user?.role !== "Administrator" && !isAssignedFilterInitialized;
    if (shouldWaitUserContext || shouldWaitAssignedFilter) {
      return;
    }

    loadItems().catch(() => setItems([]));
  }, [token, user, isAssignedFilterInitialized, filterProjectId, filterAssignedToId, filterStatus]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsCreateAttempted(true);
    const missingFields: string[] = [];
    if (!projectId) missingFields.push("Projeto");
    if (!status) missingFields.push("Status");
    if (!title.trim()) missingFields.push("Título");
    if (!description.trim()) missingFields.push("Descrição");
    if (!responsibleDeveloperId) missingFields.push("Dev responsável");
    if (!assignedToId) missingFields.push("Atribuído para");

    if (missingFields.length > 0) {
      return;
    }

    await api.post<WorkItem>(
      "/work-items",
      {
        projectId,
        title: title.trim(),
        description: description.trim(),
        status,
        responsibleDeveloperId: responsibleDeveloperId || null,
        assignedToId: assignedToId || null
      },
      token
    );

    setTitle("");
    setDescription("");
    setResponsibleDeveloperId("");
    setAssignedToId("");
    setStatus("Todo");
    setDescriptionTab("edit");
    setIsCreateAttempted(false);
    setIsCreateModalOpen(false);
    await loadItems();
  }

  async function loadDetails(itemId: string) {
    if (!token) {
      return;
    }

    const [commentRows, timeRows] = await Promise.all([
      api.get<TaskComment[]>(`/work-items/${itemId}/comments`, token),
      api.get<TimeEntry[]>(`/work-items/${itemId}/time-entries`, token)
    ]);

    setComments(commentRows);
    setTimeEntries(timeRows);
  }

  async function openDetails(item: WorkItem) {
    const defaultPeriod = createDefaultLogPeriod();
    setSelectedItem(item);
    setLogStatus(item.status);
    setLogAssignedToId(item.assignedToId ?? "");
    setLogDescription("");
    setLogStartAt(defaultPeriod.startAt);
    setLogEndAt(defaultPeriod.endAt);
    setLogWorkError("");
    await loadDetails(item.id);
  }

  function closeDetailsModal() {
    setSelectedItem(null);
    setComments([]);
    setTimeEntries([]);
    setLogDescription("");
    setLogWorkError("");
  }

  async function saveWorkLog(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedItem) {
      return;
    }

    const workedHours = calculateWorkedHours(logStartAt, logEndAt);
    if (workedHours === null) {
      setLogWorkError("Informe data e hora de início e fim válidas.");
      return;
    }

    if (workedHours > 24) {
      setLogWorkError("O intervalo informado deve ser de no máximo 24 horas.");
      return;
    }

    const workDate = logStartAt.slice(0, 10);
    setLogWorkError("");

    const updated = await api.post<WorkItem>(
      `/work-items/${selectedItem.id}/log-work`,
      {
        workDescription: logDescription,
        hours: workedHours,
        workDate,
        status: logStatus,
        assignedToId: logAssignedToId || null
      },
      token
    );

    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setSelectedItem(updated);
    setLogDescription("");
    const defaultPeriod = createDefaultLogPeriod();
    setLogStartAt(defaultPeriod.startAt);
    setLogEndAt(defaultPeriod.endAt);
    await loadDetails(updated.id);
  }

  async function moveItemToStatus(item: WorkItem, nextStatus: WorkItemStatus) {
    if (!token || item.status === nextStatus) {
      return;
    }

    setMoveError("");
    try {
      const updated = await api.put<WorkItem>(
        `/work-items/${item.id}`,
        {
          title: item.title,
          description: item.description,
          status: nextStatus,
          responsibleDeveloperId: item.responsibleDeveloperId,
          assignedToId: item.assignedToId
        },
        token
      );

      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelectedItem((prev) => (prev?.id === updated.id ? updated : prev));
    } catch {
      setMoveError("Não foi possível mover a tarefa de coluna.");
    }
  }

  function onDragStart(itemId: string, event: DragEvent<HTMLDivElement>) {
    setDraggingItemId(itemId);
    event.dataTransfer.setData("text/plain", itemId);
    event.dataTransfer.effectAllowed = "move";
  }

  function onDragEnd() {
    setDraggingItemId(null);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function onDropStatus(targetStatus: WorkItemStatus, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const droppedId = event.dataTransfer.getData("text/plain") || draggingItemId;
    setDraggingItemId(null);
    if (!droppedId) {
      return;
    }

    const item = items.find((x) => x.id === droppedId);
    if (!item) {
      return;
    }

    await moveItemToStatus(item, targetStatus);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tarefas</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-slate-300 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`rounded px-3 py-1 ${viewMode === "kanban" ? "bg-brand-700 text-white" : "text-slate-700"}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded px-3 py-1 ${viewMode === "list" ? "bg-brand-700 text-white" : "text-slate-700"}`}
            >
              Lista
            </button>
          </div>
          <button type="button" onClick={() => { setIsCreateAttempted(false); setIsCreateModalOpen(true); }} className="rounded bg-brand-700 px-3 py-2 text-white">
            Nova tarefa
          </button>
        </div>
      </div>
      {moveError && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{moveError}</p>}

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <select value={filterProjectId} onChange={(event) => setFilterProjectId(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Filtrar por projeto</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>

        <select value={filterAssignedToId} onChange={(event) => setFilterAssignedToId(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Filtrar por atribuição</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Filtrar por status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
      </div>

      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Projeto</th>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Atribuído para</th>
                <th className="px-3 py-2 text-left">Horas</th>
                <th className="px-3 py-2 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-semibold">{item.taskNumber}</td>
                  <td className="px-3 py-2">{item.projectName}</td>
                  <td className="px-3 py-2 font-semibold">{item.title}</td>
                  <td className="px-3 py-2">{statusLabels[item.status]}</td>
                  <td className="px-3 py-2">{item.assignedToName ?? "-"}</td>
                  <td className="px-3 py-2">{item.totalHours.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => openDetails(item)} className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
                      Registrar trabalho
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[960px] gap-3 lg:grid-cols-4">
            {statuses.map((columnStatus) => (
              <div
                key={columnStatus}
                onDragOver={onDragOver}
                onDrop={(event) => onDropStatus(columnStatus, event)}
                className="flex min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                  <h3 className="font-semibold">{statusLabels[columnStatus]}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {itemsByStatus[columnStatus].length}
                  </span>
                </div>

                <div className="flex-1 space-y-2 p-2">
                  {itemsByStatus[columnStatus].map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(event) => onDragStart(item.id, event)}
                      onDragEnd={onDragEnd}
                      className={`space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
                        draggingItemId === item.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">#{item.taskNumber}</p>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDetails(item)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
                        >
                          Abrir
                        </button>
                      </div>

                      <p className="text-xs text-slate-500">{item.projectName}</p>
                      <p className="text-xs text-slate-600">Atribuído: {item.assignedToName ?? "-"}</p>
                      <p className="text-xs text-slate-600">Horas: {item.totalHours.toFixed(2)}h</p>

                      <select
                        value={item.status}
                        onChange={(event) => moveItemToStatus(item, event.target.value as WorkItemStatus)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{statusLabels[s]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {itemsByStatus[columnStatus].length === 0 && (
                    <p className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
                      Sem tarefas nesta coluna.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedItem && (
        <ModalOverlay>
          <div className="max-h-[90vh] w-full max-w-5xl space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.taskNumber} - {selectedItem.title}</h3>
                <p className="text-sm text-slate-500">{selectedItem.projectName}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</p>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {selectedItem.description.trim() ? (
                    renderMarkdownPreview(selectedItem.description)
                  ) : (
                    <p className="text-slate-500">Sem descrição.</p>
                  )}
                </div>
              </div>
              <button type="button" onClick={closeDetailsModal} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Fechar
              </button>
            </div>

            <form onSubmit={saveWorkLog} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
              <select value={logStatus} onChange={(event) => setLogStatus(event.target.value as WorkItemStatus)} className="rounded border border-slate-300 px-3 py-2">
                {statuses.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>

              <select value={logAssignedToId} onChange={(event) => setLogAssignedToId(event.target.value)} className="rounded border border-slate-300 px-3 py-2">
                <option value="">Atribuído para</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>

              <textarea
                value={logDescription}
                onChange={(event) => setLogDescription(event.target.value)}
                placeholder="Descreva o que foi feito nesta tarefa"
                rows={5}
                className="w-full rounded border border-slate-300 px-3 py-2 md:col-span-2"
              />
              <p className="text-xs text-slate-500 md:col-span-2">
                Formatações Markdown: <code className="rounded bg-slate-100 px-1 py-0.5"># Título</code>, <code className="rounded bg-slate-100 px-1 py-0.5">**negrito**</code>, <code className="rounded bg-slate-100 px-1 py-0.5">*itálico*</code>, <code className="rounded bg-slate-100 px-1 py-0.5">- item</code>, <code className="rounded bg-slate-100 px-1 py-0.5">1. item</code>, <code className="rounded bg-slate-100 px-1 py-0.5">`código`</code>, <code className="rounded bg-slate-100 px-1 py-0.5">[link](https://...)</code> e <code className="rounded bg-slate-100 px-1 py-0.5">&gt; citação</code>.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Início</label>
                <input
                  type="datetime-local"
                  value={logStartAt}
                  onChange={(event) => setLogStartAt(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fim</label>
                <input
                  type="datetime-local"
                  value={logEndAt}
                  onChange={(event) => setLogEndAt(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <p className="text-xs text-slate-600 md:col-span-2">
                Tempo calculado: {calculatedLogHours !== null ? `${calculatedLogHours.toFixed(2)}h` : "-"}
              </p>
              {logWorkError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
                  {logWorkError}
                </p>
              )}

              <button className="rounded bg-brand-700 px-3 py-2 text-white md:col-span-2">Salvar registro de trabalho</button>
            </form>

            <div className="space-y-2">
              <h4 className="font-semibold">Comentários e Apontamento de Horas</h4>
              <div className="space-y-2">
                {activityItems.map((entry) => (
                  <div key={entry.id} className="rounded border border-slate-200 p-3 text-sm">
                    <p className="font-semibold">
                      {formatDateTime(entry.createdAtUtc)} - {entry.userName} - Apontamento de horas: {entry.hours !== null ? `${entry.hours.toFixed(2)}h` : "-"}
                    </p>
                    <div className="mt-2 space-y-2 text-slate-700">
                      {entry.content.trim() ? renderMarkdownPreview(entry.content) : <p className="text-slate-500">Sem conteúdo.</p>}
                    </div>
                  </div>
                ))}
                {activityItems.length === 0 && (
                  <p className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                    Nenhum comentário ou apontamento registrado.
                  </p>
                )}
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {isCreateModalOpen && (
        <ModalOverlay>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Criar tarefa</h3>
              <button type="button" onClick={() => { setIsCreateAttempted(false); setIsCreateModalOpen(false); }} className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Fechar
              </button>
            </div>

            <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-2">
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className={`rounded border px-3 py-2 ${isCreateAttempted && !projectId ? "border-red-500" : "border-slate-300"}`}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as WorkItemStatus)}
                className={`rounded border px-3 py-2 ${isCreateAttempted && !status ? "border-red-500" : "border-slate-300"}`}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da tarefa"
                className={`rounded border px-3 py-2 md:col-span-2 ${isCreateAttempted && !title.trim() ? "border-red-500" : "border-slate-300"}`}
              />
              <div className={`overflow-hidden rounded border md:col-span-2 ${isCreateAttempted && !description.trim() ? "border-red-500" : "border-slate-300"}`}>
                <div className="flex border-b border-slate-300 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setDescriptionTab("edit")}
                    className={`px-3 py-2 text-sm ${descriptionTab === "edit" ? "bg-white font-semibold" : "text-slate-600"}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescriptionTab("preview")}
                    className={`px-3 py-2 text-sm ${descriptionTab === "preview" ? "bg-white font-semibold" : "text-slate-600"}`}
                  >
                    Pré-visualizar
                  </button>
                </div>

                {descriptionTab === "edit" ? (
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Descrição da tarefa (suporte a Markdown)"
                    rows={6}
                    className="w-full resize-y px-3 py-2 outline-none"
                  />
                ) : (
                  <div className="min-h-[152px] space-y-3 px-3 py-2">
                    {description.trim() ? (
                      renderMarkdownPreview(description)
                    ) : (
                      <p className="text-sm text-slate-500">Nada para pré-visualizar.</p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 md:col-span-2">
                Formatações Markdown: <code className="rounded bg-slate-100 px-1 py-0.5"># Título</code>, <code className="rounded bg-slate-100 px-1 py-0.5">**negrito**</code>, <code className="rounded bg-slate-100 px-1 py-0.5">*itálico*</code>, <code className="rounded bg-slate-100 px-1 py-0.5">- item</code>, <code className="rounded bg-slate-100 px-1 py-0.5">1. item</code>, <code className="rounded bg-slate-100 px-1 py-0.5">`código`</code>, <code className="rounded bg-slate-100 px-1 py-0.5">[link](https://...)</code> e <code className="rounded bg-slate-100 px-1 py-0.5">&gt; citação</code>.
              </p>

              <select
                value={responsibleDeveloperId}
                onChange={(event) => setResponsibleDeveloperId(event.target.value)}
                className={`rounded border px-3 py-2 ${isCreateAttempted && !responsibleDeveloperId ? "border-red-500" : "border-slate-300"}`}
              >
                <option value="">Desenvolvedor responsável</option>
                {developerOptions.map((dev) => (
                  <option key={dev.id} value={dev.id}>{dev.fullName} ({roleLabels[dev.role] ?? dev.role})</option>
                ))}
              </select>

              <select
                value={assignedToId}
                onChange={(event) => setAssignedToId(event.target.value)}
                className={`rounded border px-3 py-2 ${isCreateAttempted && !assignedToId ? "border-red-500" : "border-slate-300"}`}
              >
                <option value="">Atribuído para</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>

              <button className="rounded bg-brand-700 px-3 py-2 text-white md:col-span-2">Criar tarefa</button>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}




