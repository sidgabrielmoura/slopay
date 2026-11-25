import { z } from "zod";

export const movementOrigin = z.enum(["PLATFORM", "API"]).nullish();
export type MovementOrigin = z.infer<typeof movementOrigin>;

export function movementOriginLabel(origin: MovementOrigin) {
  return origin === "API" ? "API" : origin === "PLATFORM" ? "Plataforma" : "Não registrada";
}
