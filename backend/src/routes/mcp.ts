import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "crypto";
import { db } from "../db/index.js";
import { config } from "../config/env.js";

const router = Router();
export const mcpDiscoveryRouter = Router();
const MCP_URL = process.env.MCP_SERVER_URL || "https://elite-bridge-shared-api-evans.vercel.app/api/mcp";
const API_BASE = process.env.MCP_API_BASE_URL || "https://elite-bridge-shared-api-evans.vercel.app/api";
const MCP_ISSUER = new URL(MCP_URL).origin;
const RESOURCE_METADATA = MCP_ISSUER + "/.well-known/oauth-protected-resource/api/mcp";
const AUTH_METADATA = MCP_ISSUER + "/.well-known/oauth-authorization-server";
const OAUTH = new URL(MCP_URL);
const oauthBase = OAUTH.pathname;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");
let tablesReady = false;

const scopeDescriptions: Record<string, string> = {
  "shifts:read": "View your organization's shifts and coverage.",
  "shifts:write": "Create, assign, or cancel shifts.",
  "caregivers:read": "View caregivers connected to your organization.",
  "caregivers:write": "Create caregiver invitations.",
  "timesheets:read": "View timesheets.",
  "timesheets:write": "Create missed-clock-in timesheets."
};
const allScopes = Object.keys(scopeDescriptions);

async function ensureMcpTables() {
  if (tablesReady) return;
  const client = (db as any).$client;
  await client.query("CREATE TABLE IF NOT EXISTS mcp_oauth_clients (client_id VARCHAR(80) PRIMARY KEY, client_name VARCHAR(200) NOT NULL, redirect_uris JSONB NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  await client.query("CREATE TABLE IF NOT EXISTS mcp_oauth_codes (code_hash VARCHAR(64) PRIMARY KEY, client_id VARCHAR(80) NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, redirect_uri TEXT NOT NULL, code_challenge VARCHAR(128) NOT NULL, scopes TEXT[] NOT NULL, resource TEXT NOT NULL, state TEXT, expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  await client.query("CREATE TABLE IF NOT EXISTS mcp_oauth_refresh_tokens (token_hash VARCHAR(64) PRIMARY KEY, client_id VARCHAR(80) NOT NULL REFERENCES mcp_oauth_clients(client_id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, scopes TEXT[] NOT NULL, resource TEXT NOT NULL, expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  await client.query("CREATE TABLE IF NOT EXISTS mcp_audit_events (id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, tool_name VARCHAR(100) NOT NULL, outcome VARCHAR(20) NOT NULL, target_id VARCHAR(100), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  tablesReady = true;
}

function oauthError(res: Response, status: number, error: string, description: string) {
  return res.status(status).json({ error, error_description: description });
}

function validRedirect(uri: string) {
  try {
    const value = new URL(uri);
    return value.protocol === "https:" || (value.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(value.hostname));
  } catch {
    return false;
  }
}

mcpDiscoveryRouter.get("/.well-known/oauth-protected-resource/api/mcp", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300").json({
    resource: MCP_URL,
    authorization_servers: [MCP_ISSUER],
    bearer_methods_supported: ["header"],
    scopes_supported: allScopes
  });
});

mcpDiscoveryRouter.get("/.well-known/oauth-authorization-server", (_req, res) => {
  res.set("Cache-Control", "public, max-age=300").json({
    issuer: MCP_ISSUER,
    authorization_endpoint: MCP_ISSUER + oauthBase + "/oauth/authorize",
    token_endpoint: MCP_ISSUER + oauthBase + "/oauth/token",
    registration_endpoint: MCP_ISSUER + oauthBase + "/oauth/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: allScopes,
    client_id_metadata_document_supported: false
  });
});

router.post("/oauth/register", async (req, res) => {
  try {
    await ensureMcpTables();
    const body = req.body || {};
    const redirects = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
    const name = String(body.client_name || "MCP client").trim().slice(0, 200);
    if (!redirects.length || redirects.length > 20 || redirects.some((uri: unknown) => typeof uri !== "string" || !validRedirect(uri))) {
      return oauthError(res, 400, "invalid_client_metadata", "Use one or more HTTPS redirect URIs. Localhost is allowed for development.");
    }
    if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") {
      return oauthError(res, 400, "invalid_client_metadata", "Only public clients using PKCE are supported.");
    }
    const clientId = randomUUID();
    await (db as any).$client.query(
      "INSERT INTO mcp_oauth_clients (client_id, client_name, redirect_uris) VALUES ($1, $2, $3::jsonb)",
      [clientId, name || "MCP client", JSON.stringify(redirects)]
    );
    return res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name || "MCP client",
      redirect_uris: redirects,
      response_types: ["code"],
      grant_types: ["authorization_code"],
      token_endpoint_auth_method: "none"
    });
  } catch (error) {
    console.error("MCP client registration failed", error);
    return oauthError(res, 500, "server_error", "Client registration is temporarily unavailable.");
  }
});

router.get("/oauth/authorize", async (req, res) => {
  try {
    await ensureMcpTables();
    const responseType = String(req.query.response_type || "");
    const clientId = String(req.query.client_id || "");
    const redirectUri = String(req.query.redirect_uri || "");
    const challenge = String(req.query.code_challenge || "");
    const method = String(req.query.code_challenge_method || "");
    const state = String(req.query.state || "");
    const resource = String(req.query.resource || MCP_URL);
    const requestedScopes = String(req.query.scope || allScopes.join(" ")).split(/\s+/).filter(Boolean);
    if (responseType !== "code") return oauthError(res, 400, "unsupported_response_type", "Authorization code flow is required.");
    if (!validRedirect(redirectUri)) return oauthError(res, 400, "invalid_request", "The redirect URI is invalid.");
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(challenge) || method !== "S256") return oauthError(res, 400, "invalid_request", "PKCE S256 is required.");
    if (resource !== MCP_URL) return oauthError(res, 400, "invalid_target", "The requested MCP resource does not match this server.");
    if (requestedScopes.some(scope => !allScopes.includes(scope))) return oauthError(res, 400, "invalid_scope", "One or more requested permissions are not supported.");
    const result = await (db as any).$client.query("SELECT redirect_uris FROM mcp_oauth_clients WHERE client_id = $1", [clientId]);
    const client = result.rows[0];
    if (!client || !(client.redirect_uris as string[]).includes(redirectUri)) return oauthError(res, 400, "invalid_client", "The client or redirect URI is not registered.");
    if (state.length > 512) return oauthError(res, 400, "invalid_request", "The state value is too long.");
    const requestToken = jwt.sign({
      clientId, redirectUri, challenge, state, resource, scopes: requestedScopes,
      exp: Math.floor(Date.now() / 1000) + 300
    }, config.JWT_SECRET, { issuer: MCP_ISSUER, audience: "elitebridge-mcp-authorization-request" });
    const consentUrl = new URL("/mcp-authorize.html", config.WEB_APP_URL);
    consentUrl.searchParams.set("request", requestToken);
    return res.redirect(302, consentUrl.toString());
  } catch (error) {
    console.error("MCP authorization request failed", error);
    return oauthError(res, 500, "server_error", "Authorization is temporarily unavailable.");
  }
});

router.post("/oauth/approve", async (req, res) => {
  try {
    await ensureMcpTables();
    const requestToken = String(req.body?.authorizationRequest || "");
    const appToken = String(req.body?.appToken || "");
    if (!requestToken || !appToken) return oauthError(res, 400, "invalid_request", "The authorization request and Elite Bridge session are required.");
    const pending = jwt.verify(requestToken, config.JWT_SECRET, { issuer: MCP_ISSUER, audience: "elitebridge-mcp-authorization-request" }) as any;
    const session = jwt.verify(appToken, config.JWT_SECRET) as any;
    if (!Number.isInteger(Number(session.id)) || !["employer", "admin"].includes(session.role)) return oauthError(res, 403, "access_denied", "Only an Elite Bridge employer or administrator can authorize this connection.");
    const userResult = await (db as any).$client.query("SELECT id, role, is_active FROM users WHERE id = $1 LIMIT 1", [Number(session.id)]);
    const user = userResult.rows[0];
    if (!user || user.is_active === false || !["employer", "admin"].includes(user.role)) return oauthError(res, 403, "access_denied", "This account cannot authorize the connection.");
    const code = randomToken();
    await (db as any).$client.query(
      "INSERT INTO mcp_oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, scopes, resource, state, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW() + INTERVAL '5 minutes')",
      [sha256(code), pending.clientId, Number(user.id), pending.redirectUri, pending.challenge, pending.scopes, pending.resource, pending.state || null]
    );
    const redirect = new URL(pending.redirectUri);
    redirect.searchParams.set("code", code);
    if (pending.state) redirect.searchParams.set("state", pending.state);
    return res.json({ redirectUrl: redirect.toString() });
  } catch (error) {
    console.error("MCP approval failed", error);
    return oauthError(res, 400, "invalid_grant", "The authorization request expired or could not be verified.");
  }
});

router.post("/oauth/deny", (req, res) => {
  try {
    const pending = jwt.verify(String(req.body?.authorizationRequest || ""), config.JWT_SECRET, { issuer: MCP_ISSUER, audience: "elitebridge-mcp-authorization-request" }) as any;
    const redirect = new URL(pending.redirectUri);
    redirect.searchParams.set("error", "access_denied");
    redirect.searchParams.set("error_description", "Elite Bridge access was not approved.");
    if (pending.state) redirect.searchParams.set("state", pending.state);
    return res.json({ redirectUrl: redirect.toString() });
  } catch {
    return oauthError(res, 400, "invalid_request", "The authorization request is invalid or expired.");
  }
});

function accessToken(user: any, scopes: string[], clientId: string, resource: string) {
  return jwt.sign({
    id: user.id, sub: String(user.id), email: user.email, role: user.role,
    scope: scopes.join(" "), client_id: clientId, token_use: "mcp_access"
  }, config.JWT_SECRET, { issuer: MCP_ISSUER, audience: resource, expiresIn: "1h" });
}

router.post("/oauth/token", async (req, res) => {
  try {
    await ensureMcpTables();
    const body = req.body || {};
    const clientId = String(body.client_id || "");
    if (body.grant_type === "refresh_token") {
      const oldRefreshToken = String(body.refresh_token || "");
      const existing = await (db as any).$client.query(
        "SELECT * FROM mcp_oauth_refresh_tokens WHERE token_hash = $1 AND client_id = $2 AND used_at IS NULL AND expires_at > NOW() LIMIT 1",
        [sha256(oldRefreshToken), clientId]
      );
      const grant = existing.rows[0];
      if (!grant) return oauthError(res, 400, "invalid_grant", "The refresh token is invalid, expired, or already used.");
      const consumed = await (db as any).$client.query(
        "UPDATE mcp_oauth_refresh_tokens SET used_at = NOW() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING *",
        [sha256(oldRefreshToken)]
      );
      if (!consumed.rows[0]) return oauthError(res, 400, "invalid_grant", "The refresh token was already used.");
      const userResult = await (db as any).$client.query("SELECT id, email, role, is_active FROM users WHERE id = $1 LIMIT 1", [grant.user_id]);
      const user = userResult.rows[0];
      if (!user || user.is_active === false || !["employer", "admin"].includes(user.role)) return oauthError(res, 400, "invalid_grant", "The authorizing account is no longer active.");
      const nextRefreshToken = randomToken();
      await (db as any).$client.query(
        "INSERT INTO mcp_oauth_refresh_tokens (token_hash, client_id, user_id, scopes, resource, expires_at) VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '30 days')",
        [sha256(nextRefreshToken), clientId, user.id, grant.scopes, grant.resource]
      );
      return res.json({ access_token: accessToken(user, grant.scopes as string[], clientId, grant.resource), token_type: "Bearer", expires_in: 3600, refresh_token: nextRefreshToken, scope: (grant.scopes as string[]).join(" ") });
    }
    if (body.grant_type !== "authorization_code") return oauthError(res, 400, "unsupported_grant_type", "The grant type is not supported.");
    const redirectUri = String(body.redirect_uri || "");
    const code = String(body.code || "");
    const verifier = String(body.code_verifier || "");
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return oauthError(res, 400, "invalid_grant", "A valid PKCE verifier is required.");
    const result = await (db as any).$client.query(
      "SELECT * FROM mcp_oauth_codes WHERE code_hash = $1 AND client_id = $2 AND redirect_uri = $3 AND used_at IS NULL AND expires_at > NOW() LIMIT 1",
      [sha256(code), clientId, redirectUri]
    );
    const grant = result.rows[0];
    if (!grant) return oauthError(res, 400, "invalid_grant", "The authorization code is invalid, expired, or already used.");
    const computed = createHash("sha256").update(verifier).digest("base64url");
    if (computed !== grant.code_challenge) return oauthError(res, 400, "invalid_grant", "PKCE verification failed.");
    const consumed = await (db as any).$client.query(
      "UPDATE mcp_oauth_codes SET used_at = NOW() WHERE code_hash = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING *",
      [sha256(code)]
    );
    if (!consumed.rows[0]) return oauthError(res, 400, "invalid_grant", "The authorization code was already used.");
    const userResult = await (db as any).$client.query("SELECT id, email, role, is_active FROM users WHERE id = $1 LIMIT 1", [grant.user_id]);
    const user = userResult.rows[0];
    if (!user || user.is_active === false || !["employer", "admin"].includes(user.role)) return oauthError(res, 400, "invalid_grant", "The authorizing account is no longer active.");
    const refreshToken = randomToken();
    await (db as any).$client.query(
      "INSERT INTO mcp_oauth_refresh_tokens (token_hash, client_id, user_id, scopes, resource, expires_at) VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '30 days')",
      [sha256(refreshToken), clientId, user.id, grant.scopes, grant.resource]
    );
    return res.json({ access_token: accessToken(user, grant.scopes as string[], clientId, grant.resource), token_type: "Bearer", expires_in: 3600, refresh_token: refreshToken, scope: (grant.scopes as string[]).join(" ") });
  } catch (error) {
    console.error("MCP token exchange failed", error);
    return oauthError(res, 400, "invalid_grant", "The authorization code could not be exchanged.");
  }
});

const toolList = [
  { name: "elitebridge_list_shifts", description: "List shifts in the authenticated employer's organization. Street addresses and care notes are omitted.", inputSchema: { type: "object", properties: { status: { type: "string", enum: ["open", "assigned", "in_progress", "cancelled", "completed"] }, fromDate: { type: "string", description: "Optional ISO date YYYY-MM-DD." }, toDate: { type: "string", description: "Optional ISO date YYYY-MM-DD." }, limit: { type: "integer", minimum: 1, maximum: 100, default: 50 } }, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: "elitebridge_list_caregivers", description: "List caregivers connected to the authenticated employer organization. Excludes private client details.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: "elitebridge_create_shift", description: "Publish a shift for the authenticated employer. Requires explicit user instruction to publish. Client bill rate and caregiver pay rate remain separate.", inputSchema: { type: "object", properties: { title: { type: "string" }, serviceType: { type: "string" }, caregiverType: { type: "string" }, careRecipientName: { type: "string" }, startDate: { type: "string", description: "YYYY-MM-DD" }, endDate: { type: "string" }, timeZone: { type: "string", default: "America/New_York" }, startTime: { type: "string", description: "24-hour HH:mm" }, endTime: { type: "string", description: "24-hour HH:mm" }, location: { type: "object", properties: { type: { type: "string", enum: ["client_home", "facility", "other"] }, address: { type: "string" }, city: { type: "string" }, state: { type: "string" }, zipCode: { type: "string" } }, required: ["address", "city", "state", "zipCode"] }, pay: { type: "object", properties: { hourlyRate: { type: "number" }, currency: { type: "string", enum: ["USD"] } }, required: ["hourlyRate"] }, numberOfCaregivers: { type: "integer", minimum: 1, maximum: 50, default: 1 }, responsibilities: { type: "string" }, notes: { type: "string" }, contact: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" } }, required: ["name", "phone"] }, urgency: { type: "string", enum: ["standard", "urgent"], default: "standard" }, assignmentMode: { type: "string", enum: ["instant", "review"], default: "review" }, confirmPublish: { type: "boolean", description: "Set true only when the user explicitly asked to publish this shift." } }, required: ["title", "serviceType", "caregiverType", "startDate", "startTime", "endTime", "location", "pay", "responsibilities", "contact", "confirmPublish"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "elitebridge_assign_caregiver", description: "Assign a connected caregiver to an open shift. This creates a confirmed booking and enforces availability and overlap checks. Requires explicit assignment instruction and confirmAssignment=true.", inputSchema: { type: "object", properties: { shiftId: { type: "integer" }, caregiverId: { type: "integer" }, caregiverPayRate: { type: "number" }, confirmAssignment: { type: "boolean" } }, required: ["shiftId", "caregiverId", "confirmAssignment"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "elitebridge_cancel_shift", description: "Cancel a shift and notify assigned caregivers. Requires explicit user instruction and confirmCancel=true.", inputSchema: { type: "object", properties: { shiftId: { type: "integer" }, confirmCancel: { type: "boolean" } }, required: ["shiftId", "confirmCancel"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { name: "elitebridge_invite_caregiver", description: "Create an organization-specific caregiver signup invitation and return a secure link. The app may prepare email/text drafts; it does not guarantee delivery.", inputSchema: { type: "object", properties: { firstName: { type: "string" }, lastName: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" } }, required: ["firstName"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "elitebridge_list_timesheets", description: "List the employer's manual missed-clock-in timesheets and their approval status.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: "elitebridge_create_missed_clock_in", description: "Create a manual missed-clock-in timesheet for employer review. Requires the staff pay rate, date, time range, and explicit user instruction to record it.", inputSchema: { type: "object", properties: { staffName: { type: "string" }, startDate: { type: "string", description: "YYYY-MM-DD" }, endDate: { type: "string", description: "YYYY-MM-DD; same as startDate for one shift." }, startTime: { type: "string", description: "24-hour HH:mm" }, endTime: { type: "string", description: "24-hour HH:mm" }, hourlyRate: { type: "number", minimum: 0.01 }, unpaidBreakMinutes: { type: "integer", minimum: 0, default: 0 }, includeWeekends: { type: "boolean", default: true }, reason: { type: "string" } }, required: ["staffName", "startDate", "endDate", "startTime", "endTime", "hourlyRate", "reason"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } }
];

const requiredScope: Record<string, string> = {
  elitebridge_list_shifts: "shifts:read",
  elitebridge_list_caregivers: "caregivers:read",
  elitebridge_create_shift: "shifts:write",
  elitebridge_assign_caregiver: "shifts:write",
  elitebridge_cancel_shift: "shifts:write",
  elitebridge_invite_caregiver: "caregivers:write",
  elitebridge_list_timesheets: "timesheets:read",
  elitebridge_create_missed_clock_in: "timesheets:write"
};

function bearer(req: Request) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function verifyMcpToken(token: string) {
  const payload = jwt.verify(token, config.JWT_SECRET, { issuer: MCP_ISSUER, audience: MCP_URL }) as any;
  if (payload.token_use !== "mcp_access" || !Number.isInteger(Number(payload.id)) || !["employer", "admin"].includes(payload.role)) throw new Error("Invalid MCP access token");
  const userResult = await (db as any).$client.query("SELECT id, role, is_active FROM users WHERE id = $1 LIMIT 1", [Number(payload.id)]);
  const user = userResult.rows[0];
  if (!user || user.is_active === false || !["employer", "admin"].includes(user.role)) throw new Error("Account inactive or unauthorized");
  return { id: Number(user.id), role: user.role as string, scopes: String(payload.scope || "").split(/\s+/).filter(Boolean), token };
}

async function upstream(path: string, token: string, method = "GET", body?: unknown) {
  const response = await fetch(API_BASE + path, {
    method,
    headers: { Authorization: "Bearer " + token, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 1000) }; }
  if (!response.ok) throw new Error(String(data.message || data.error || "Elite Bridge API request failed (" + response.status + ")"));
  return data;
}

function result(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
}

async function executeTool(name: string, args: any, token: string) {
  if (name === "elitebridge_list_shifts") {
    const data = await upstream("/bookings/employer/my", token);
    const shifts = Array.isArray(data) ? data : (data.shifts || data.bookings || []);
    const filtered = shifts.filter((shift: any) => {
      const date = String(shift.startTime || shift.start_time || "").slice(0, 10);
      return (!args.status || String(shift.status).toLowerCase() === args.status) &&
        (!args.fromDate || date >= args.fromDate) && (!args.toDate || date <= args.toDate);
    }).slice(0, Math.min(100, Math.max(1, Number(args.limit || 50))));
    return result({ count: filtered.length, shifts: filtered.map((s: any) => ({
      id: s.id, title: s.title, serviceType: s.serviceType || s.service_type,
      startTime: s.startTime || s.start_time, endTime: s.endTime || s.end_time,
      status: s.status, hourlyRate: s.hourlyRate || s.hourly_rate,
      numberOfCaregivers: s.numberOfCaregivers || s.number_of_caregivers,
      assignedCaregivers: s.assignedCaregivers || s.assigned_caregivers || 0,
      city: s.location?.city || s.city, state: s.location?.state || s.state
    })) });
  }
  if (name === "elitebridge_list_caregivers") return result(await upstream("/bookings/employer/team", token));
  if (name === "elitebridge_create_shift") {
    if (args.confirmPublish !== true) throw new Error("Not published. Ask the user to confirm publishing, then call again with confirmPublish=true.");
    const { confirmPublish, ...payload } = args;
    return result(await upstream("/bookings", token, "POST", payload));
  }
  if (name === "elitebridge_assign_caregiver") {
    if (args.confirmAssignment !== true) throw new Error("Not assigned. Confirm the caregiver and shift with the user before assigning.");
    const { shiftId, caregiverId, caregiverPayRate } = args;
    return result(await upstream("/bookings/employer/" + encodeURIComponent(String(shiftId)) + "/assign", token, "POST", { caregiverId, ...(caregiverPayRate ? { caregiverPayRate } : {}) }));
  }
  if (name === "elitebridge_cancel_shift") {
    if (args.confirmCancel !== true) throw new Error("Not cancelled. Confirm cancellation with the user before proceeding.");
    return result(await upstream("/bookings/employer/" + encodeURIComponent(String(args.shiftId)) + "/cancel", token, "PATCH", {}));
  }
  if (name === "elitebridge_invite_caregiver") {
    return result(await upstream("/employers/invitations", token, "POST", args));
  }
  if (name === "elitebridge_list_timesheets") return result(await upstream("/manual-timesheets/employer", token));
  if (name === "elitebridge_create_missed_clock_in") return result(await upstream("/manual-timesheets/employer", token, "POST", args));
  throw new Error("Unknown tool.");
}

async function audit(userId: number, toolName: string, outcome: string, targetId?: string) {
  try {
    await ensureMcpTables();
    await (db as any).$client.query(
      "INSERT INTO mcp_audit_events (user_id, tool_name, outcome, target_id) VALUES ($1,$2,$3,$4)",
      [userId, toolName, outcome, targetId ? String(targetId).slice(0, 100) : null]
    );
  } catch (error) { console.error("MCP audit write failed", error); }
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

router.post("/", async (req, res) => {
  const token = bearer(req);
  let auth: { id: number; role: string; scopes: string[]; token: string };
  try { auth = await verifyMcpToken(token); }
  catch {
    res.set("WWW-Authenticate", 'Bearer resource_metadata="' + RESOURCE_METADATA + '", error="invalid_token"');
    return res.status(401).json({ error: "invalid_token", error_description: "Valid Elite Bridge authorization is required." });
  }
  const processMessage = async (message: any) => {
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return jsonRpcError(message?.id, -32600, "Invalid JSON-RPC request.");
    if (message.method === "notifications/initialized" || message.method.startsWith("notifications/")) return null;
    if (message.method === "ping") return { jsonrpc: "2.0", id: message.id, result: {} };
    if (message.method === "initialize") return {
      jsonrpc: "2.0", id: message.id,
      result: { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "elite-bridge", version: "1.0.0" } }
    };
    if (message.method === "tools/list") return { jsonrpc: "2.0", id: message.id, result: { tools: toolList } };
    if (message.method === "tools/call") {
      const name = String(message.params?.name || "");
      const scope = requiredScope[name];
      if (!scope) return jsonRpcError(message.id, -32602, "Unknown tool.");
      if (!auth.scopes.includes(scope)) {
        res.set("WWW-Authenticate", 'Bearer error="insufficient_scope", scope="' + scope + '", resource_metadata="' + RESOURCE_METADATA + '"');
        return jsonRpcError(message.id, -32003, "Permission required: " + scope + ". Reconnect and grant this permission.");
      }
      try {
        const data = await executeTool(name, message.params?.arguments || {}, token);
        const args = message.params?.arguments || {};
        await audit(auth.id, name, "success", args.shiftId || args.caregiverId || args.staffName || undefined);
        return { jsonrpc: "2.0", id: message.id, result: data };
      } catch (error: any) {
        await audit(auth.id, name, "failed");
        return { jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: error?.message || "The Elite Bridge action failed." }], isError: true } };
      }
    }
    return jsonRpcError(message.id, -32601, "Method not found.");
  };
  try {
    res.set("MCP-Protocol-Version", "2025-06-18");
    const request = req.body;
    if (Array.isArray(request)) {
      const responses = (await Promise.all(request.map(processMessage))).filter(Boolean);
      if (!responses.length) return res.status(202).end();
      return res.status(200).json(responses);
    }
    const response = await processMessage(request);
    if (!response) return res.status(202).end();
    return res.status(200).json(response);
  } catch (error) {
    console.error("MCP request failed", error);
    return res.status(500).json(jsonRpcError(req.body?.id, -32603, "Internal MCP error."));
  }
});

router.get("/", (_req, res) => res.set("Allow", "POST").status(405).end());
router.delete("/", (_req, res) => res.set("Allow", "POST").status(405).end());

export default router;
