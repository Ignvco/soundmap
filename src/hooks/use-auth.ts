import { useSession } from "@/components/providers/auth";
export const useAuth = useSession;
export function useUser() {
  const { user, isLoading } = useSession();
  return { user, isLoading };
}
