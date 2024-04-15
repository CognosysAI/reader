import fs from 'fs';
import path from 'path';

export function loadModulesDynamically(directory: string): void {
    const files = fs.readdirSync(directory);
    files.forEach((file) => {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
            const filePath = path.join(directory, file);
            require(filePath);
        }
    });
}
