import { createTRPCRouter } from "./create-context";
import hiRoute, { uploadImageProcedure } from "./routes/example/hi/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
    uploadImage: uploadImageProcedure,
  }),
});

export type AppRouter = typeof appRouter;