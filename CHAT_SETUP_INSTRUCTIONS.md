# Chat Enhancement Setup Instructions

## 📋 Tổng quan

Đã hoàn thiện tính năng chat với các chức năng:
- ✅ Chat với AI qua nhiều providers (OpenAI, Anthropic, Google, OpenRouter)
- ✅ Lưu lịch sử chat và context vào database
- ✅ Tracking token usage và cost theo từng model
- ✅ Statistics dashboard theo model, provider, ngày
- ✅ Model/Provider management với orchestration rules
- ✅ Mermaid diagram hiển thị orchestration flow
- ✅ Enter để gửi chat (Shift+Enter xuống dòng)

## 🗄️ Database Migration

### 1. Chạy migration mới

```bash
# Kết nối vào PostgreSQL
psql -U postgres -d gateway_db

# Chạy migration file
\i packages/infra-postgres/src/migrations/015_chat_enhancements.sql

# Kiểm tra tables đã được tạo
\dt

# Kiểm tra views
\dv
```

### 2. Verify tables được tạo

```sql
-- Kiểm tra chat contexts table
SELECT COUNT(*) FROM chat_contexts;

-- Kiểm tra token usage table  
SELECT COUNT(*) FROM conversation_token_usage;

-- Kiểm tra user stats table
SELECT COUNT(*) FROM user_token_stats;

-- Kiểm tra AI providers
SELECT * FROM ai_providers;

-- Kiểm tra orchestration rules
SELECT * FROM orchestration_rules;
```

## 📦 Install Dependencies

### Backend (không cần thêm dependencies mới)

```bash
cd apps/api
pnpm install
```

### Frontend - Thêm Mermaid.js

```bash
cd apps/web-ui
pnpm add mermaid
```

## 🚀 Running the Application

### 1. Start Backend API

```bash
cd apps/api
pnpm dev
```

API sẽ chạy ở: http://localhost:3000

### 2. Start Frontend

```bash
cd apps/web-ui
pnpm dev
```

Web UI sẽ chạy ở: http://localhost:5173

### 3. Verify API Endpoints

Kiểm tra các endpoints mới:

```bash
# Health check
curl http://localhost:3000/health

# Chat endpoints (cần auth token)
curl -X POST http://localhost:3000/chat/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Stats endpoints
curl http://localhost:3000/chat/stats/daily \
  -H "Authorization: Bearer YOUR_TOKEN"

# Models list
curl http://localhost:3000/chat/models \
  -H "Authorization: Bearer YOUR_TOKEN"

# Providers list
curl http://localhost:3000/chat/providers \
  -H "Authorization: Bearer YOUR_TOKEN"

# Orchestration rules
curl http://localhost:3000/chat/orchestration \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎯 Testing Chat Functionality

### 1. Truy cập Chat UI

Mở browser: http://localhost:5173/chat

### 2. Test các chức năng

1. **Send message**: 
   - Nhập message vào textbox
   - Press Enter để gửi (hoặc click Send button)
   - Shift+Enter để xuống dòng

2. **Model selection**:
   - Chọn model từ dropdown trên input box
   - GPT-4o Mini, Claude 3 Haiku, Gemini Pro, etc.

3. **Daily stats**: 
   - Xem token usage và cost ở header sidebar
   - Hiển thị realtime sau mỗi message

4. **Multiple conversations**:
   - Click "New Chat" để tạo conversation mới
   - Switch giữa các conversations
   - Delete conversation

### 3. Test Model Management

Truy cập: http://localhost:5173/models

1. **Models tab**:
   - Xem danh sách models available
   - Adjust priority (↑ ↓ buttons)
   - Xem cost per 1K tokens

2. **Providers tab**:
   - Xem providers (OpenAI, Anthropic, Google, etc.)
   - Check status và capabilities

3. **Orchestration tab**:
   - Create/Edit orchestration rules
   - Define model fallback sequence
   - View Mermaid diagram của orchestration flow

### 4. Test Statistics

Truy cập: http://localhost:5173/stats

- Xem usage by model
- Daily breakdown
- Cost analysis
- Token consumption

## 🔧 Configuration

### Environment Variables

Thêm vào `.env` (nếu chưa có):

```env
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
OPENROUTER_API_KEY=sk-or-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/gateway_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Insert Sample Model Configs

```sql
-- Insert sample models (nếu chưa có)
INSERT INTO model_configs (
  id, provider, tier, context_window, max_tokens, 
  cost_per_1k_input, cost_per_1k_output, 
  supports_streaming, supports_functions, 
  priority, status
) VALUES
  ('openai/gpt-4o-mini', 'openai', 0, 128000, 16000, 0.00015, 0.00060, true, true, 10, 'active'),
  ('openai/gpt-4o', 'openai', 1, 128000, 16000, 0.0025, 0.010, true, true, 20, 'active'),
  ('anthropic/claude-3-haiku', 'anthropic', 0, 200000, 8000, 0.00025, 0.00125, true, true, 15, 'active'),
  ('anthropic/claude-3-sonnet', 'anthropic', 1, 200000, 8000, 0.003, 0.015, true, true, 25, 'active'),
  ('google/gemini-pro', 'google', 1, 32000, 8000, 0.0005, 0.0015, true, false, 30, 'active')
ON CONFLICT (id) DO UPDATE SET
  cost_per_1k_input = EXCLUDED.cost_per_1k_input,
  cost_per_1k_output = EXCLUDED.cost_per_1k_output;
```

## 📊 Database Schema Overview

### Các bảng mới:

1. **chat_contexts** - Lưu context quan trọng từ conversations
2. **conversation_token_usage** - Token usage per conversation & model
3. **user_token_stats** - Aggregated stats by user, date, model
4. **ai_providers** - Provider configurations
5. **orchestration_rules** - Model selection strategies
6. **model_performance** - Performance metrics per model

### Cột mới trong bảng cũ:

**conversations**:
- `model`, `provider` - Model được sử dụng
- `status` - active/archived/deleted
- `context_summary` - Tóm tắt context
- `total_tokens`, `total_cost` - Tracking

**messages**:
- `model`, `provider` - Model info
- `prompt_tokens`, `completion_tokens` - Token breakdown
- `cost` - Chi phí message
- `latency_ms` - Response time
- `error` - Error message nếu có

### Triggers tự động:

1. **update_conversation_stats** - Tự động update tổng tokens/cost khi có message mới
2. **aggregate_token_usage** - Tự động aggregate vào usage tables

## 🎨 UI Components

### Pages created:

1. **/chat** - Enhanced chat interface với stats
2. **/models** - Model/Provider/Orchestration management
3. **/stats** - Usage statistics dashboard

### Features:

- Model selector trong chat
- Real-time daily stats
- Token/cost display
- Mermaid diagram cho orchestration
- Responsive design với Flowbite Svelte

## 🐛 Troubleshooting

### Migration fails

```bash
# Drop và recreate nếu cần
DROP TABLE IF EXISTS chat_contexts CASCADE;
DROP TABLE IF EXISTS conversation_token_usage CASCADE;
-- etc...

# Sau đó chạy lại migration
```

### API returns 401 Unauthorized

```bash
# Tạo test user và lấy token
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Login để lấy token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Chat không response

1. Kiểm tra API keys trong .env
2. Check logs: `tail -f apps/api/logs/*.log`
3. Verify models table có data
4. Test trực tiếp API endpoint

### Mermaid diagram không render

```bash
# Verify mermaid installed
cd apps/web-ui
npm list mermaid

# Reinstall nếu cần
pnpm add -D mermaid
```

## 📝 Next Steps

Có thể mở rộng:

1. **Advanced Analytics**:
   - Charts với Chart.js hoặc D3
   - Cost forecasting
   - Model comparison reports

2. **Context Management**:
   - UI để xem/edit chat contexts
   - Auto-summarization settings
   - Context pruning strategies

3. **Real-time Updates**:
   - WebSocket cho real-time stats
   - Live token counter trong chat
   - Cost alerts

4. **Export/Import**:
   - Export chat history
   - Export statistics reports
   - Import orchestration rules

5. **Advanced Orchestration**:
   - Conditional routing based on content
   - Load balancing with rate limits
   - A/B testing different models

## ✅ Checklist

- [ ] Database migration chạy thành công
- [ ] Mermaid package đã install
- [ ] Backend API khởi động không lỗi
- [ ] Frontend build thành công
- [ ] Chat send message hoạt động
- [ ] Daily stats hiển thị
- [ ] Model management page load được
- [ ] Stats page hiển thị data
- [ ] Mermaid diagram render
- [ ] Navigation giữa các pages hoạt động

---

**Đã hoàn thành tất cả yêu cầu! 🎉**
