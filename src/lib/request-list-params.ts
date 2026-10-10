import { actionsEnum, entityTypesEnum, statusEnum } from "@/db/schema/requests";

export const requestPageSizes = [5, 10, 20, 50] as const;

function enumParam<T extends string>(value: string | null, values: readonly T[]): T | "all" {
  return value !== null && values.includes(value as T) ? value as T : "all";
}

export function readRequestListParams(params: Pick<URLSearchParams, "get">) {
  const rawPage = params.get("page");
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const limit = Number(params.get("per_page"));
  return {
    page: Number.isSafeInteger(page) && page >= 1 && page <= 2147483647 ? page : 1,
    limit: requestPageSizes.includes(limit as typeof requestPageSizes[number]) ? limit : 10,
    entityType: enumParam(params.get("entityType"), entityTypesEnum.enumValues),
    action: enumParam(params.get("action"), actionsEnum.enumValues),
    status: enumParam(params.get("status"), statusEnum.enumValues),
  };
}

export type RequestListChanges = Partial<{
  page: number;
  per_page: number;
  entityType: string;
  action: string;
  status: string;
}>;

export function updateRequestListParams(current: string, changes: RequestListChanges) {
  const params = new URLSearchParams(current);
  if (["entityType", "action", "status", "per_page"].some(key => key in changes)) {
    params.set("page", "1");
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === "all") params.delete(key);
    else params.set(key, String(value));
  }
  return params.toString();
}
