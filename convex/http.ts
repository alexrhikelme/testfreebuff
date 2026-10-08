import { httpRouter } from "convex/server";
import { auth } from "./auth";

/**
 * Sprint 9 (D3) — Rotas HTTP do Convex Auth:
 * - /.well-known/openid-configuration
 * - /.well-known/jwks.json
 */
const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
