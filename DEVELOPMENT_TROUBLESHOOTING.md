# 🔧 Hướng Dẫn Fix Lỗi `pnpm run dev`

## 🐛 Vấn Đề

Khi chạy `pnpm run dev` từ web-ui, bạn gặp lỗi:
```
[vite] http proxy error: /api/netops/devices
AggregateError [ECONNREFUSED]: connect ECONNREFUSED
```

## 🔍 Nguyên Nhân

Web-UI được cấu hình để proxy tất cả requests tới `/api` sang **API server chạy trên `http://localhost:3000`**.

File `vite.config.ts`:
```typescript
proxy: {
    '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
    }
}
```

Nhưng **API server chưa được khởi động**, nên Vite không thể kết nối.

---

## ✅ Giải Pháp

### Bước 1: Mở Terminal Mới

Mở một terminal PowerShell **khác** (đừng dừng terminal web-ui hiện tại).

### Bước 2: Chạy API Server

```bash
cd "e:\GitHub\MCP server\apps\api"
pnpm run dev
```

Bạn sẽ thấy output:
```
> @apps/api@2.0.0 dev
> tsx watch src/main.ts

[10:30:15] ✓ Server listening on port 3000
[10:30:15] Ready for requests
```

### Bước 3: Web-UI sẽ Tự Kết Nối

Quay lại terminal web-ui, bạn sẽ thấy lỗi proxy biến mất và web-ui sẽ hoạt động bình thường.

---

## 🏃 Chạy Cả Hai Cùng Lúc (Recommended)

### Option 1: Dùng VS Code Integrated Terminal

1. **Terminal 1**: API Server
   ```bash
   cd apps/api
   pnpm run dev
   ```

2. **Terminal 2**: Web-UI
   ```bash
   cd apps/web-ui
   pnpm run dev
   ```

### Option 2: Dùng Separate PowerShell Windows

1. **Window 1**: API
   ```bash
   cd "e:\GitHub\MCP server\apps\api"
   pnpm run dev
   ```

2. **Window 2**: Web-UI
   ```bash
   cd "e:\GitHub\MCP server\apps\web-ui"
   pnpm run dev
   ```

### Option 3: Dùng tmux hoặc tmuxinator (Advanced)

Tạo file `tmuxinator.yml`:
```yaml
name: netops
root: e:\GitHub\MCP server
windows:
  - api:
      layout: main-vertical
      panes:
        - cd apps/api && pnpm run dev
  - web:
      panes:
        - cd apps/web-ui && pnpm run dev
```

---

## 🚀 Startup Sequence

```
1. Start API Server
   └─ Port 3000
   
2. Start Web-UI
   └─ Port 5173 (or next available)
   └─ Proxy /api → http://localhost:3000
   
3. Open Browser
   └─ http://localhost:5173
   └─ Or http://localhost:5174 if 5173 is taken
```

---

## 📊 Ports Reference

| Service | Port | URL |
|---------|------|-----|
| **API Server** | 3000 | `http://localhost:3000` |
| **Web-UI** | 5173 | `http://localhost:5173` |
| **Web-UI (alt)** | 5174+ | If 5173 is in use |

---

## ✨ Verification

### API Server Running
```bash
curl http://localhost:3000/health
# Expected: 200 OK with health status
```

### Web-UI Proxy Working
1. Open http://localhost:5173
2. Go to Devices page
3. Should see devices list (if API has data)
4. No more proxy errors in console

---

## 🆘 Troubleshooting

### Port 5173 Already in Use
Web-UI tự động chuyển sang port 5174, 5175, v.v.
```
Port 5173 is in use, trying another one...
➜  Local:   http://localhost:5174/
```

### Port 3000 Already in Use
Tìm process sử dụng port 3000:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### API Server Not Responding
Kiểm tra logs của API server để tìm lỗi.

### Proxy Still Failing
```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Restart API
cd apps/api && pnpm run dev

# Restart Web-UI
cd apps/web-ui && pnpm run dev
```

---

## 📝 Commands Cheat Sheet

```bash
# Terminal 1 - API Server
cd "e:\GitHub\MCP server\apps\api"
pnpm run dev

# Terminal 2 - Web-UI
cd "e:\GitHub\MCP server\apps\web-ui"
pnpm run dev

# Then open browser
start http://localhost:5173

# Build production
cd apps/api && pnpm run build
cd apps/web-ui && pnpm run build

# Run tests
cd apps/api && pnpm run test
cd apps/web-ui && pnpm test

# Type check
cd apps/api && pnpm run typecheck
cd apps/web-ui && pnpm run check
```

---

## ✅ Expected Output

### API Server
```
> @apps/api@2.0.0 dev
> tsx watch src/main.ts

[10:30:15] Building for development...
[10:30:18] ✓ Server listening on port 3000
[10:30:18] Ready for requests

GET  /health                200
POST /netops/devices        201
```

### Web-UI
```
> @apps/web-ui@1.0.0 dev
> vite dev --port 5173

  VITE v5.4.21  ready in 1912 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

**Status**: ✅ Ready to develop!

See [Architecture Guide](../../docs/ARCHITECTURE.md) for more details.
