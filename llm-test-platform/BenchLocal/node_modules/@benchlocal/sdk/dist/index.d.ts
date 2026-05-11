import type { BenchPackRuntime, GenerationRequest, HostContext, InferenceEndpoint, BenchPackManifest, ProviderConfig, RegisteredModel, RunningInferenceEndpoint, ScenarioResult, ScenarioMeta, SecretResolution, VerifierEndpoint } from "@benchlocal/core";
export type { BenchPackRuntime, BenchmarkScore, GenerationRequest, HostContext, InferenceEndpoint, BenchPackManifest, ProgressEmitter, ProgressEvent, ProviderConfig, RegisteredModel, RunningInferenceEndpoint, ScenarioResult, ScenarioRunInput, ScenarioMeta, SecretResolution, VerifierEndpoint } from "@benchlocal/core";
export declare const BENCHLOCAL_SCHEMA_VERSION: 1;
export declare const BENCHLOCAL_PROTOCOL_VERSION: 1;
export type BenchPackManifestInput = Omit<BenchPackManifest, "schemaVersion" | "protocolVersion">;
export type ProviderLookupOptions = {
    enabledOnly?: boolean;
    required?: boolean;
};
export type SidecarLookupOptions = {
    required?: boolean;
    runningOnly?: boolean;
};
export type VerifierLookupOptions = SidecarLookupOptions;
export type HostHelpers = {
    getProvider: (providerId: string, options?: ProviderLookupOptions) => ProviderConfig | undefined;
    getRequiredProvider: (providerId: string, options?: Omit<ProviderLookupOptions, "required">) => ProviderConfig;
    getSecret: (providerId: string) => SecretResolution | undefined;
    getSecretValue: (providerId: string) => string | undefined;
    getRequiredSecretValue: (providerId: string) => string;
    getRegisteredModel: (modelId: string) => RegisteredModel | undefined;
    getRequiredModel: (modelId: string) => RegisteredModel;
    getInferenceEndpoint: (modelId: string) => InferenceEndpoint | undefined;
    getRequiredInferenceEndpoint: (modelId: string) => RunningInferenceEndpoint;
    getVerifier: (verifierId: string, options?: VerifierLookupOptions) => VerifierEndpoint | undefined;
    getRequiredVerifier: (verifierId: string, options?: Omit<VerifierLookupOptions, "required">) => VerifierEndpoint;
    getSidecar: (sidecarId: string, options?: SidecarLookupOptions) => VerifierEndpoint | undefined;
    getRequiredSidecar: (sidecarId: string, options?: Omit<SidecarLookupOptions, "required">) => VerifierEndpoint;
    resolveGenerationRequest: (overrides?: GenerationRequest) => GenerationRequest;
    getScenarioById: <TScenario extends Pick<ScenarioMeta, "id">>(scenarios: readonly TScenario[], scenarioId: string) => TScenario;
};
export type ScoredScenarioResult = ScenarioResult & {
    score: number;
};
export declare function defineBenchPackManifest<const TManifest extends BenchPackManifestInput>(manifest: TManifest): BenchPackManifest & TManifest;
export declare function defineBenchPack<const TBenchPack extends BenchPackRuntime>(benchPack: TBenchPack): TBenchPack;
export declare function loadBenchPackManifest(moduleDir: string): BenchPackManifest;
export declare function createHostHelpers(context: HostContext): HostHelpers;
export declare function requireScoredResults(results: ScenarioResult[]): ScoredScenarioResult[];
//# sourceMappingURL=index.d.ts.map