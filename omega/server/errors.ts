export class AppError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export function badRequest(message: string, code = 'bad_request') {
  return new AppError(message, 400, code)
}

export function unauthorized(message = 'Authentication required') {
  return new AppError(message, 401, 'unauthorized')
}

export function forbidden(message = 'Forbidden') {
  return new AppError(message, 403, 'forbidden')
}

export function notFound(message = 'Not found') {
  return new AppError(message, 404, 'not_found')
}

export function conflict(message: string, code = 'conflict') {
  return new AppError(message, 409, code)
}

export function unavailable(message: string, code = 'unavailable') {
  return new AppError(message, 503, code)
}
