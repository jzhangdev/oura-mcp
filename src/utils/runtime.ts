const MIN_NODE_MAJOR = 18;
type RequiredEnvVar = "OURA_ACCESS_TOKEN";

export type RuntimeConfig = {
  ouraAccessToken: string;
};

export class RuntimeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeValidationError";
  }
}

function getNodeMajorVersion(nodeVersion: string): number {
  const [major] = nodeVersion.split(".");
  return Number(major);
}

function formatNodeVersion(nodeVersion: string): string {
  return nodeVersion.startsWith("v") ? nodeVersion : `v${nodeVersion}`;
}

function validateNodeVersion(nodeVersion: string): void {
  const nodeMajor = getNodeMajorVersion(nodeVersion);
  if (!nodeMajor || nodeMajor < MIN_NODE_MAJOR) {
    throw new RuntimeValidationError(
      `Node.js >= ${MIN_NODE_MAJOR} is required. Current: ${formatNodeVersion(nodeVersion)}`
    );
  }
}

function requireEnvVar(env: NodeJS.ProcessEnv, key: RequiredEnvVar): string {
  const value = env[key];
  if (!value) {
    throw new RuntimeValidationError(`Missing ${key}. Set it in environment or .env file.`);
  }

  return value;
}

export function validateStartupRuntime(nodeVersion: string = process.versions.node): void {
  validateNodeVersion(nodeVersion);
}

export function parseRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  nodeVersion: string = process.versions.node
): RuntimeConfig {
  validateNodeVersion(nodeVersion);

  return {
    ouraAccessToken: requireEnvVar(env, "OURA_ACCESS_TOKEN"),
  };
}

export function validateRuntime(): RuntimeConfig {
  return parseRuntimeConfig();
}
