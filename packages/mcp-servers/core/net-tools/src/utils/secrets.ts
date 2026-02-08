const SECRET_KEYS = ['community', 'authPassword', 'privPassword', 'password', 'privateKey']

export function maskSecrets<T extends Record<string, any>>(input: T): T {
    const clone: Record<string, any> = Array.isArray(input) ? [] : {}
    for (const [key, value] of Object.entries(input)) {
        if (SECRET_KEYS.includes(key)) {
            clone[key] = '***'
        } else if (value && typeof value === 'object') {
            clone[key] = maskSecrets(value as Record<string, any>)
        } else {
            clone[key] = value
        }
    }
    return clone as T
}
