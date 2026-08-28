export class WikiError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(message: string, code: string, exitCode = 1) {
    super(message);
    this.name = "WikiError";
    this.code = code;
    this.exitCode = exitCode;
  }
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
