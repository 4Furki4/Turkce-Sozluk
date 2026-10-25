import { createHash, createHmac } from "node:crypto";

export const MANAGER = "dictionary-branch-previews-v1";

export function previewIdentity({ repository, branch, project = "dictionary", domain = "furkan-cengiz.com" }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) throw new Error("Invalid GitHub repository");
  if (!branch || /[\x00-\x20\x7f]/.test(branch) || ["main", "develop"].includes(branch.toLowerCase())) {
    throw new Error("A feature branch is required; main and develop are excluded");
  }
  if (!/^[a-z][a-z0-9-]{0,19}$/.test(project) || project.endsWith("-")) throw new Error("Invalid preview project prefix");
  domain = domain.toLowerCase();
  if (domain.length > 189 || !domain.includes(".") || !domain.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error("Invalid preview base domain");
  }
  repository = repository.toLowerCase();
  const hash = createHash("sha256").update(`${repository}\0${branch}`).digest("hex").slice(0, 12);
  const slug = branch.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "branch";
  const readable = slug.slice(0, 63 - project.length - hash.length - 2).replace(/-+$/g, "");
  const hostname = `${project}-${readable}-${hash}.${domain}`;
  return { repository, branch, hash, name: `preview-${project}-${hash}`, hostname, url: `https://${hostname}` };
}

export function ownership(identity, environmentUuid) {
  return JSON.stringify({ managedBy: MANAGER, repository: identity.repository, branch: identity.branch, identity: identity.hash, environmentUuid });
}

export function isOwned(resource, identity, environmentUuid) {
  return resource.name === identity.name && resource.description === ownership(identity, environmentUuid);
}

export function credential(secret, identity, purpose) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("PREVIEW_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(`${MANAGER}\0${identity.repository}\0${identity.branch}\0${purpose}`).digest("hex");
}

export function imageNames(repository, identity, sha) {
  if (!/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)+$/.test(repository ?? "")) throw new Error("Invalid preview image repository");
  if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("A full GitHub commit SHA is required");
  return { app: `${repository}:preview-${identity.hash}-${sha}` };
}
