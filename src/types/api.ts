export type ActionResult<T = void> = { data: T; error?: never } | { data?: never; error: string };
