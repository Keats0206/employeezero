interface Params {
  args?: Record<string, unknown>;
  action: string;
  error: unknown;
}

export function getRichError({ action, args, error }: Params) {
  const message = error instanceof Error ? error.message : String(error);
  let full = `Error during ${action}: ${message}`;
  if (args) full += `\nParameters: ${JSON.stringify(args, null, 2)}`;
  return { message: full, error: { message } };
}
