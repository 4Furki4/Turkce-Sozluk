import { createOpenIdConfiguration } from "@/src/lib/oidc-metadata";
import { getBaseUrl } from "@/src/lib/seo-utils";

export function createAuthMarkdown(issuer = getBaseUrl()): string {
  const configuration = createOpenIdConfiguration(issuer);

  return [
    "# Turkish Dictionary auth.md",
    "",
    "## Audience",
    "",
    "This service supports OAuth 2.0 and OpenID Connect for AI agents acting on behalf of a signed-in Turkish Dictionary user.",
    "",
    "## Discover",
    "",
    `- OpenID Connect metadata: ${issuer}/.well-known/openid-configuration`,
    `- OAuth authorization server metadata: ${issuer}/.well-known/oauth-authorization-server`,
    `- Protected tRPC API metadata: ${issuer}/.well-known/oauth-protected-resource`,
    "",
    "## Register",
    "",
    `Register an OAuth client with ${configuration.registration_endpoint}. Dynamic client registration is enabled.`,
    "",
    "- Public agents use `token_endpoint_auth_method=none` and PKCE.",
    "- Confidential clients receive a `client_id` and `client_secret`; keep the secret private.",
    "- Register every exact HTTPS redirect URI before beginning authorization.",
    "",
    "## Authorize",
    "",
    `Use the authorization code flow at ${configuration.authorization_endpoint}. Request the \`openid api\` scopes and use an S256 PKCE code challenge.`,
    "",
    "The user signs in and grants consent in their browser. Exchange the returned code at the token endpoint using the registered redirect URI and PKCE verifier.",
    "",
    "## Call the API",
    "",
    `Present the resulting access token to ${issuer}/api/trpc:`,
    "",
    "```http",
    "Authorization: Bearer ACCESS_TOKEN",
    "```",
    "",
    "The `api` scope is required for protected tRPC procedures. Tokens without that scope are not accepted for protected operations.",
    "",
    "## Lifecycle",
    "",
    "This service does not expose agent identity-claim or credential-revocation endpoints. Re-register a client when its redirect URIs or credentials need to change.",
    "",
  ].join("\n");
}
