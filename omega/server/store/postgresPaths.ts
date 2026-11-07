/** Application tables live in schema omega (not public) for PostgREST isolation. */
export const OMEGA_SEARCH_PATH = 'omega, public'
/** Startup GUC form (no spaces) so libpq/postgres.js connection params stay unambiguous. */
export const OMEGA_SEARCH_PATH_GUC = 'omega,public'
