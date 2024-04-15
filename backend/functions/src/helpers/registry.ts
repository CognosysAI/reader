interface ExportedModule {
    [key: string]: any;
}

class Registry {
    private modules: ExportedModule = {};

    register(name: string, module: any): void {
        this.modules[name] = module;
    }

    get(name: string): any {
        return this.modules[name];
    }

    exportAll(): ExportedModule {
        return this.modules;
    }

    exportGrouped(groupOptions: any): ExportedModule {
        const groupedModules: ExportedModule = {};
        for (const [name, module] of Object.entries(this.modules)) {
            if (module.groupOptions && module.groupOptions === groupOptions) {
                groupedModules[name] = module;
            }
        }
        return groupedModules;
    }
}

export const registry = new Registry();
