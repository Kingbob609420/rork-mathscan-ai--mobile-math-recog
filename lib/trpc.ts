import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  try {
    console.log("[tRPC] Getting base URL...");
    
    if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
      console.log("[tRPC] Base URL found:", process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
      return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    }

    console.error("[tRPC] No base URL found in EXPO_PUBLIC_RORK_API_BASE_URL");
    
    return "";
  } catch (error) {
    console.error("[tRPC] Error getting base URL:", error);
    return "";
  }
};

console.log("[tRPC] Module loading...");

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

console.log("[tRPC] tRPC client created");
