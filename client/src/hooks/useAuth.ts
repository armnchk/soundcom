import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: () => fetch("/api/auth/user", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .catch(() => null),
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
