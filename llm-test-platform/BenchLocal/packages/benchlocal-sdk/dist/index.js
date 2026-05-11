"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BENCHLOCAL_PROTOCOL_VERSION = exports.BENCHLOCAL_SCHEMA_VERSION = void 0;
exports.defineBenchPackManifest = defineBenchPackManifest;
exports.defineBenchPack = defineBenchPack;
exports.loadBenchPackManifest = loadBenchPackManifest;
exports.createHostHelpers = createHostHelpers;
exports.requireScoredResults = requireScoredResults;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
exports.BENCHLOCAL_SCHEMA_VERSION = 1;
exports.BENCHLOCAL_PROTOCOL_VERSION = 1;
function compactGenerationRequest(input) {
    if (!input) {
        return {};
    }
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
function createLookupError(kind, id, detail) {
    return new Error(detail ? `${kind} "${id}" ${detail}` : `${kind} "${id}" was not found.`);
}
function defineBenchPackManifest(manifest) {
    return {
        schemaVersion: exports.BENCHLOCAL_SCHEMA_VERSION,
        protocolVersion: exports.BENCHLOCAL_PROTOCOL_VERSION,
        ...manifest
    };
}
function defineBenchPack(benchPack) {
    return benchPack;
}
function loadBenchPackManifest(moduleDir) {
    const manifestPath = node_path_1.default.resolve(moduleDir, "..", "..", "benchlocal.pack.json");
    const raw = (0, node_fs_1.readFileSync)(manifestPath, "utf8");
    return JSON.parse(raw);
}
function createHostHelpers(context) {
    const providerMap = new Map(context.providers.map((provider) => [provider.id, provider]));
    const secretMap = new Map(context.secrets.map((secret) => [secret.providerId, secret]));
    const modelMap = new Map(context.models.map((model) => [model.id, model]));
    const inferenceEndpointMap = new Map((context.inferenceEndpoints ?? []).map((endpoint) => [endpoint.modelId, endpoint]));
    const verifierMap = new Map((context.verifiers ?? context.sidecars ?? []).map((verifier) => [verifier.id, verifier]));
    return {
        getProvider(providerId, options) {
            const provider = providerMap.get(providerId);
            if (!provider) {
                if (options?.required) {
                    throw createLookupError("Provider", providerId);
                }
                return undefined;
            }
            if (options?.enabledOnly && !provider.enabled) {
                if (options.required) {
                    throw createLookupError("Provider", providerId, "is configured but disabled.");
                }
                return undefined;
            }
            return provider;
        },
        getRequiredProvider(providerId, options) {
            return this.getProvider(providerId, {
                ...options,
                required: true
            });
        },
        getSecret(providerId) {
            return secretMap.get(providerId);
        },
        getSecretValue(providerId) {
            return secretMap.get(providerId)?.value;
        },
        getRequiredSecretValue(providerId) {
            const secret = secretMap.get(providerId);
            if (!secret?.value) {
                throw createLookupError("Secret", providerId, "is missing.");
            }
            return secret.value;
        },
        getRegisteredModel(modelId) {
            return modelMap.get(modelId);
        },
        getRequiredModel(modelId) {
            const model = modelMap.get(modelId);
            if (!model) {
                throw createLookupError("Model", modelId);
            }
            return model;
        },
        getInferenceEndpoint(modelId) {
            return inferenceEndpointMap.get(modelId);
        },
        getRequiredInferenceEndpoint(modelId) {
            const endpoint = inferenceEndpointMap.get(modelId);
            if (!endpoint) {
                throw createLookupError("Inference endpoint", modelId);
            }
            if (endpoint.status !== "running") {
                throw createLookupError("Inference endpoint", modelId, endpoint.details ?? "is present but not running.");
            }
            return endpoint;
        },
        getVerifier(verifierId, options) {
            const verifier = verifierMap.get(verifierId);
            if (!verifier) {
                if (options?.required) {
                    throw createLookupError("Verifier", verifierId);
                }
                return undefined;
            }
            if (options?.runningOnly && verifier.status !== "running") {
                if (options.required) {
                    throw createLookupError("Verifier", verifierId, "is present but not running.");
                }
                return undefined;
            }
            return verifier;
        },
        getRequiredVerifier(verifierId, options) {
            return this.getVerifier(verifierId, {
                ...options,
                required: true
            });
        },
        getSidecar(sidecarId, options) {
            return this.getVerifier(sidecarId, options);
        },
        getRequiredSidecar(sidecarId, options) {
            return this.getRequiredVerifier(sidecarId, options);
        },
        resolveGenerationRequest(overrides) {
            return compactGenerationRequest(overrides);
        },
        getScenarioById(scenarios, scenarioId) {
            const scenario = scenarios.find((candidate) => candidate.id === scenarioId);
            if (!scenario) {
                throw createLookupError("Scenario", scenarioId);
            }
            return scenario;
        }
    };
}
function requireScoredResults(results) {
    return results.map((result) => ({
        ...result,
        score: result.score ?? 0
    }));
}
