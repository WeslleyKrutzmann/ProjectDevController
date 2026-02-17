import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { AuthResponse, User } from "../lib/types";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "pdc_token";
const USER_KEY = "pdc_user";
type PersistMode = "local" | "session";

function parseStoredUser(raw: string | null): User | null {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as Partial<User>;
  return {
    id: parsed.id ?? "",
    fullName: parsed.fullName ?? "",
    email: parsed.email ?? "",
    role: (parsed.role as User["role"]) ?? "Developer",
    isActive: parsed.isActive ?? true
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [persistMode, setPersistMode] = useState<PersistMode>(() => {
    const localToken = localStorage.getItem(TOKEN_KEY);
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    return localToken ? "local" : sessionToken ? "session" : "local";
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) {
      return parseStoredUser(localStorage.getItem(USER_KEY));
    }

    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) {
      return parseStoredUser(sessionStorage.getItem(USER_KEY));
    }

    return null;
  });

  function persistAuth(authToken: string, authUser: User, mode: PersistMode) {
    if (mode === "local") {
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, authToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(authUser));
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function login(email: string, password: string, rememberMe: boolean) {
    const response = await api.post<AuthResponse>("/auth/login", { email, password });
    const mode: PersistMode = rememberMe ? "local" : "session";
    setPersistMode(mode);
    setToken(response.token);
    setUser(response.user);
    persistAuth(response.token, response.user, mode);
  }

  function logout() {
    setToken(null);
    setUser(null);
    setPersistMode("local");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  async function refreshMe() {
    if (!token) {
      return;
    }

    const me = await api.get<User>("/auth/me", token);
    setUser(me);
    persistAuth(token, me, persistMode);
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    refreshMe().catch(() => {
      logout();
    });
  }, [token]);

  const value = useMemo(
    () => ({ token, user, login, logout, refreshMe }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
