export type UserRole = "Administrator" | "Developer" | "Tester";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  createdById: string;
  createdAtUtc: string;
  taskCount: number;
};

export type WorkItemStatus = "Todo" | "InProgress" | "InTesting" | "Done";

export type WorkItem = {
  id: string;
  taskNumber: number;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: WorkItemStatus;
  createdById: string;
  createdByName: string;
  responsibleDeveloperId: string | null;
  responsibleDeveloperName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  totalHours: number;
};

export type TaskComment = {
  id: string;
  workItemId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAtUtc: string;
};

export type TimeEntry = {
  id: string;
  workItemId: string;
  userId: string;
  userName: string;
  hours: number;
  description: string;
  workDate: string;
  createdAtUtc: string;
};

export type HoursByUserReportRow = {
  userId: string;
  userName: string;
  role: string;
  totalHours: number;
};

export type AuthResponse = {
  token: string;
  expiresAtUtc: string;
  user: User;
};
