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

function createProtectedResourceMetadata(
  resource: string,
  issuer: string,
  resourceName: string,
) {
  return {
    resource,
    authorization_servers: [issuer],
    scopes_supported: ["api"],
    bearer_methods_supported: ["header"],
    resource_name: resourceName,
    resource_documentation: `${issuer}/auth.md`,
  };
}

export function createOAuthProtectedResourceMetadata(issuer = getBaseUrl()) {
  return createProtectedResourceMetadata(issuer, issuer, "Turkish Dictionary");
}

export function createTrpcOAuthProtectedResourceMetadata(issuer = getBaseUrl()) {
  return createProtectedResourceMetadata(
    new URL("/api/trpc", issuer).toString(),
    issuer,
    "Turkish Dictionary tRPC API",
  );
}

export function createOAuthAuthorizationServerMetadata(issuer = getBaseUrl()) {
  const openIdConfiguration = createOpenIdConfiguration(issuer);
  const protectedResource = createTrpcOAuthProtectedResourceMetadata(issuer);

  return {
    ...openIdConfiguration,
    protected_resources: [protectedResource.resource],
    agent_auth: {
      skill: `${issuer}/auth.md`,
      register_uri: openIdConfiguration.registration_endpoint,
      claim_uri: openIdConfiguration.authorization_endpoint,
      identity_types_supported: ["anonymous"],
      anonymous: {
        credential_types_supported: ["access_token"],
      },
    },
  };
}
