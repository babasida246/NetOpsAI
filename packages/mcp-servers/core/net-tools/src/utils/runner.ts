import { nettoolsConfig } from './config.js'
import { runCommand } from './command.js'

export async function runNettoolsCommand(args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    if (nettoolsConfig.execMode === 'mock') {
        throw new Error('NETTOOLS_EXEC_MODE=mock cannot run external commands')
    }

    if (nettoolsConfig.execMode === 'docker') {
        const dockerArgs = ['exec', nettoolsConfig.nettoolsContainerName, ...args]
        return await runCommand('docker', dockerArgs, timeoutMs)
    }

    return await runCommand(args[0], args.slice(1), timeoutMs)
}
