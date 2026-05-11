export type BenchLocalThemeColorScheme = "light" | "dark";
export type BenchLocalThemeDefinition = {
    schemaVersion: 1;
    id: string;
    name: string;
    colorScheme: BenchLocalThemeColorScheme;
    variables: Record<string, string>;
};
export type BenchLocalThemeDescriptor = {
    id: string;
    name: string;
    colorScheme: BenchLocalThemeColorScheme;
    source: "builtin" | "user";
    path?: string;
};
export declare function getThemeStorageDir(): string;
export declare function loadThemeDefinitionFromFile(filePath: string): Promise<BenchLocalThemeDefinition>;
//# sourceMappingURL=theme.d.ts.map