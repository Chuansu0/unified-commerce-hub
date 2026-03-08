import { create } from "zustand";

export type UserRole = "superadmin" | "user" | "guest";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  role: UserRole;
  login: (username: string, role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!sessionStorage.getItem("auth_token"),
  username: sessionStorage.getItem("auth_user"),
  role: (sessionStorage.getItem("auth_role") as UserRole) || "guest",
  login: (username, role) => {
    sessionStorage.setItem("auth_token", "1");
    sessionStorage.setItem("auth_user", username);
    sessionStorage.setItem("auth_role", role);
    set({ isAuthenticated: true, username, role });
  },
  logout: () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_role");
    set({ isAuthenticated: false, username: null, role: "guest" });
  },
}));
