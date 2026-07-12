import { getBaseUrl } from "@/src/lib/seo-utils";
import type { OIDCMetadata } from "better-auth/plugins";

const OIDC_SCOPES = ["openid", "profile", "email", "offline_access", "api"];

export function createOpenIdConfiguration(issuer = getBaseUrl()) {
  const authBaseUrl = new URL("/api/auth", issuer).toString();

  return {
    issuer,
    authorization_endpoint: `${authBaseUrl}/oauth2/authorize`,
    token_endpoint: `${authBaseUrl}/oauth2/token`,
    userinfo_endpoint: `${authBaseUrl}/oauth2/userinfo`,
    jwks_uri: `${authBaseUrl}/jwks`,
    registration_endpoint: `${authBaseUrl}/oauth2/register`,
    end_session_endpoint: `${authBaseUrl}/oauth2/endsession`,
    scopes_supported: OIDC_SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    acr_values_supported: [
      "urn:mace:incommon:iap:silver",
      "urn:mace:incommon:iap:bronze",
    ],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    code_challenge_methods_supported: ["S256"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "nbf",
      "iat",
      "jti",
      "email",
      "email_verified",
      "name",
    ],
  } satisfies Partial<OIDCMetadata>;
}
