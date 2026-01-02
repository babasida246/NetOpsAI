import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Routes files to fix
const routeFiles = [
    'apps/api/src/modules/admin/admin.routes.ts',
    'apps/api/src/modules/conversations/conversations.routes.ts',
    'apps/api/src/modules/netops/netops.routes.ts'
]

routeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath)
    let content = fs.readFileSync(fullPath, 'utf8')

    // Remove schema objects from all routes
    // Match: schema: { ... }, (potentially with preHandler or other properties)
    // Replace with just the preHandler (if it exists) or nothing
    content = content.replace(
        /schema:\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\},?\s*/g,
        ''
    )

    // Clean up any double commas or comma issues
    content = content.replace(/,\s*,/g, ',')
    content = content.replace(/\{\s*,/g, '{')
    content = content.replace(/,\s*\}/g, '}')

    fs.writeFileSync(fullPath, content, 'utf8')
    console.log(`Fixed: ${filePath}`)
})

console.log('Done!')
