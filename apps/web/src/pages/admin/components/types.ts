export interface AdminProps {
  token: string | null;
  toast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  currentUser: { id: number; role?: string; displayName?: string };
}