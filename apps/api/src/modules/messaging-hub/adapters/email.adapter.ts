import { env } from '../../../config/env.js'
import type { OutboundEnvelope } from '../contracts.js'

export class EmailAdapter {
    async send(envelope: OutboundEnvelope): Promise<{ externalMessageId?: string }> {
        if (!envelope.target.email) {
            throw new Error('Missing email target')
        }

        if (!env.SMTP_HOST) {
            // TODO: Integrate real email sender (SMTP or internal send_email tool).
            return { externalMessageId: `mock-email-${Date.now()}` }
        }

        // TODO: Implement SMTP send using a mailer library.
        return { externalMessageId: `mock-email-${Date.now()}` }
    }
}
