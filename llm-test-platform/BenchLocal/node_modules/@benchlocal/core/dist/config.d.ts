export type BenchLocalProviderKind = "openrouter" | "huggingface" | "ollama" | "llamacpp" | "mlx" | "lmstudio" | "pico" | "openai_compatible";
export type BenchLocalProviderConfig = {
    kind: BenchLocalProviderKind;
    name: string;
    enabled: boolean;
    base_url: string;
    api_key?: string;
    api_key_env?: string;
};
export type BenchLocalModelConfig = {
    id: string;
    provider: string;
    model: string;
    label: string;
    group: string;
    enabled: boolean;
};
export type BenchLocalVerifierMode = "cloud" | "docker" | "custom_url";
export type BenchLocalVerifierConfig = {
    mode: BenchLocalVerifierMode;
    auto_start: boolean;
    custom_url?: string;
    cloud_url?: string;
    docker_image?: string;
};
export type BenchLocalSidecarConfig = BenchLocalVerifierConfig;
export type BenchLocalBenchPackConfig = {
    enabled: boolean;
    source: "registry" | "archive" | "github" | "local" | "git";
    repo?: string;
    path?: string;
    url?: string;
    ref?: string;
    version?: string;
    auto_update?: boolean;
    verifiers?: Record<string, BenchLocalVerifierConfig>;
    sidecars?: Record<string, BenchLocalSidecarConfig>;
};
export type BenchLocalRegistryConfig = {
    official_url: string;
};
export type BenchLocalConfig = {
    schema_version: 1;
    default_benchpack: string;
    run_storage_dir: string;
    benchpack_storage_dir: string;
    log_storage_dir: string;
    cache_dir: string;
    registry: BenchLocalRegistryConfig;
    ui: {
        theme: string;
    };
    providers: Record<string, BenchLocalProviderConfig>;
    models: BenchLocalModelConfig[];
    benchpacks: Record<string, BenchLocalBenchPackConfig>;
};
export type LoadedBenchLocalConfig = {
    path: string;
    created: boolean;
    config: BenchLocalConfig;
};
export declare function getBenchLocalHome(): string;
export declare function expandHomePath(input: string): string;
export declare function getConfigPath(): string;
export declare function createDefaultConfig(): BenchLocalConfig;
export declare function loadConfigFile(configPath?: string): Promise<BenchLocalConfig>;
export declare function loadOrCreateConfig(configPath?: string): Promise<LoadedBenchLocalConfig>;
export declare function saveConfigFile(config: BenchLocalConfig, configPath?: string): Promise<BenchLocalConfig>;
//# sourceMappingURL=config.d.ts.map