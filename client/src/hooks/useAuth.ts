import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error, isFetched } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Evita refetch desnecessário
  });

  // If there's an error (like 401), consider user as not authenticated
  const isAuthenticated = !!user && !error;

  // Só considera como carregando se nunca foi buscado antes
  const isReallyLoading = isLoading && !isFetched;

  return {
    user,
    isLoading: isReallyLoading,
    isAuthenticated,
  };
}
