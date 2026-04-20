export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly action?: string;

  constructor(message: string, statusCode: number, code: string, action?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.action = action;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
