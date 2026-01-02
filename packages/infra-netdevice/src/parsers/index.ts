/**
 * Parsers Public API
 */

export { BaseParser, ParserRegistry, parserRegistry } from './base.js'
export { CiscoParser } from './cisco.parser.js'
export { MikroTikParser } from './mikrotik.parser.js'
export { FortiGateParser } from './fortigate.parser.js'

// Register all parsers
import { parserRegistry } from './base.js'
import { CiscoParser } from './cisco.parser.js'
import { MikroTikParser } from './mikrotik.parser.js'
import { FortiGateParser } from './fortigate.parser.js'

// Auto-register on import
parserRegistry.register(new CiscoParser())
parserRegistry.register(new MikroTikParser())
parserRegistry.register(new FortiGateParser())
