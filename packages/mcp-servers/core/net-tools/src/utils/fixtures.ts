import fs from 'fs/promises'
import path from 'path'
import { nettoolsConfig } from './config.js'

export async function loadFixtureText(name: string): Promise<string> {
    const filePath = path.join(nettoolsConfig.fixtureDir, name)
    return await fs.readFile(filePath, 'utf-8')
}

export async function loadFixtureJson<T>(name: string): Promise<T> {
    const text = await loadFixtureText(name)
    return JSON.parse(text) as T
}
