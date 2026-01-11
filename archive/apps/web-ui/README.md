# NetOps Web UI

Modern web interface for NetOps Copilot - Network Operations Management System.

## Features

- **Device Management**: View, create, and manage network devices (Cisco, MikroTik, FortiGate)
- **Configuration Management**: Pull configs, parse/normalize, view diffs
- **Lint Engine**: Run compliance checks with customizable rulepacks
- **Change Workflow**: Full change management from planning to deployment
- **Dark Mode**: Full dark mode support
- **Responsive**: Mobile-friendly design

## Tech Stack

- **Framework**: SvelteKit 2.0 + Svelte 5
- **Styling**: Tailwind CSS + Flowbite Svelte
- **Language**: TypeScript
- **Build**: Vite

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+

### Install Dependencies

```bash
pnpm install
```

### Run Dev Server

```bash
pnpm dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## API Configuration

The web UI connects to the NetOps API at `/api` by default (proxied in development).

To change the API base URL, modify `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://your-api-server:3000',
      changeOrigin: true
    }
  }
}
```

## Pages

### Devices (`/netops/devices`)
- List all devices with filtering by vendor, site, role
- Search by name or IP
- Create new devices
- Import devices from CSV
- View device details

### Device Detail (`/netops/devices/[id]`)
- View device facts
- View configuration history
- Pull new config
- Collect facts
- Run lint checks

### Config Detail (`/netops/configs/[versionId]`)
- View raw configuration
- Parse and normalize config
- Run lint checks
- Compare with other versions

### Rulepacks (`/netops/rulepacks`)
- View all rulepacks
- Activate rulepack
- View rulepack rules

### Changes (`/netops/changes`)
- List all change requests
- Filter by status and risk tier
- Create new changes

### New Change (`/netops/changes/new`)
- Step-by-step wizard
- Select devices
- Configure intent parameters
- Review and create

### Change Detail (`/netops/changes/[id]`)
- View change details
- Run plan/generate/verify
- Submit for approval
- Deploy changes
- View change sets per device

## Docker

### Build Image

```bash
docker build -t netops-web-ui .
```

### Run Container

```bash
docker run -p 3000:3000 -e API_URL=http://api:3000 netops-web-ui
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production/development)

## License

MIT
