export const full_repo = process.env.GITHUB_REPOSITORY ?? "";

export const github = {
  token: process.env.GITHUB_TOKEN,
  owner: full_repo.split("/")[0],
  repository: full_repo.split("/")[1],
};

export const namespace_regex = process.env.NAMESPACE_REGEX ?? "rev-(\\d+)";
export const blacklist = (process.env.NAMESPACE_BLACKLIST || "").split(",");

export const k8screds = process.env.K8S_CREDENTIALS;
