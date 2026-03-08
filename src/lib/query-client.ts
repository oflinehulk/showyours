import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { Sentry } from "@/lib/sentry";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min — avoid refetching unchanged data
      gcTime: 10 * 60 * 1000,         // 10 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        toast.error('Action failed', { description: getUserFriendlyMessage(error) });
        Sentry.captureException(error);
      },
    },
  },
});
