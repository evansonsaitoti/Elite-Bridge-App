// Vercel injects runtime OIDC credentials on each function request. Never log them.
export function aiGatewayToken(headers: Record<string, string | string[] | undefined>, env = process.env): string | undefined {
  if (env.AI_GATEWAY_API_KEY) return env.AI_GATEWAY_API_KEY;
  if (env.VERCEL === "1") {
    const runtimeToken = headers["x-vercel-oidc-token"];
    if (typeof runtimeToken === "string" && runtimeToken.trim()) return runtimeToken;
  }
  return env.VERCEL_OIDC_TOKEN || undefined;
}
