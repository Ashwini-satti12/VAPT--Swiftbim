export interface User {
  id: number;
  full_name: string;
  email: string;
  company_id: number | string;
  user_role?: string;
  panels?: string[];
  profile_picture?: string | null;
  is_super_admin?: boolean;
  /** 1 = management, 2 = team leader, 3 = employee */
  panel_type?: number;
  /** 'client' when logged in via client portal */
  user_type?: 'employee' | 'client' | 'vendor';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  setToken: (t: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  clientLogin: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export interface DashboardStats {
  totalProjects: number;
  completedProjects: number;
  inProgressTasks: number;
  completedTasks: number;
  newTasks: number;
  totaltoday: number;
}
