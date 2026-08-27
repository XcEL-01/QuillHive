import { z } from "zod";

export type {
  GetGroupPostsParams as ApiGetGroupPostsParams,
} from "./generated/api";

export type {
  GetGroupPostsParams as TypesGetGroupPostsParams,
} from "./generated/types";

export const HealthCheckResponse = z.object({
  status: z.enum(["ok", "error", "unconfigured"]),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponse>;
