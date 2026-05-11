import type { GenerationRequest } from "./protocol.js";
export type BenchLocalExecutionMode = "serial" | "serial_by_model" | "parallel_by_model" | "parallel_by_test_case" | "full_parallel";
export type BenchLocalWorkspaceTabModelSelection = {
    modelId: string;
    alias?: string;
};
export type BenchLocalWorkspaceTab = {
    id: string;
    title: string;
    benchPackId: string | null;
    loadedRunId?: string | null;
    focusedScenarioId: string | null;
    modelSelections: BenchLocalWorkspaceTabModelSelection[];
    samplingOverrides?: GenerationRequest;
    executionMode: BenchLocalExecutionMode;
    createdAt: string;
    updatedAt: string;
};
export type BenchLocalWorkspace = {
    id: string;
    name: string;
    tabIds: string[];
    activeTabId: string | null;
    createdAt: string;
    updatedAt: string;
};
export type BenchLocalWorkspaceState = {
    schema_version: 1;
    activeWorkspaceId: string | null;
    workspaceOrder: string[];
    workspaces: Record<string, BenchLocalWorkspace>;
    tabs: Record<string, BenchLocalWorkspaceTab>;
};
export type LoadedBenchLocalWorkspaceState = {
    path: string;
    created: boolean;
    state: BenchLocalWorkspaceState;
};
export declare function getWorkspaceStatePath(): string;
export declare function createDefaultWorkspaceState(defaultBenchPack?: string): BenchLocalWorkspaceState;
export declare function loadWorkspaceStateFile(statePath?: string, defaultBenchPack?: string): Promise<BenchLocalWorkspaceState>;
export declare function loadOrCreateWorkspaceState(statePath?: string, defaultBenchPack?: string): Promise<LoadedBenchLocalWorkspaceState>;
export declare function saveWorkspaceStateFile(state: BenchLocalWorkspaceState, statePath?: string, defaultBenchPack?: string): Promise<BenchLocalWorkspaceState>;
//# sourceMappingURL=workspaces.d.ts.map