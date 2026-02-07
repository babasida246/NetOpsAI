# Chat & AI Module

> AI-powered conversation interface with multi-provider support

## Overview

The Chat module provides:
- Real-time AI conversations
- Multiple AI provider support
- Conversation history
- Token usage tracking
- Model selection and routing

## Chat Interface

### URL
`/chat`

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌────────────────────────────────────────┤
│  │             │  │ Model: Claude 3.5 Sonnet          ▼  │
│  │ Conversation│  ├────────────────────────────────────────┤
│  │    List     │  │                                        │
│  │             │  │         Conversation Area              │
│  │ • Chat 1    │  │                                        │
│  │ • Chat 2    │  │  User: How do I configure...           │
│  │ • Chat 3    │  │                                        │
│  │             │  │  AI: To configure the system...        │
│  │             │  │                                        │
│  │             │  │                                        │
│  │             │  ├────────────────────────────────────────┤
│  │ [+ New]     │  │  [Type your message...]      [Send]   │
│  └─────────────┘  └────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### Features

| Feature | Description |
|---------|-------------|
| New Conversation | Start fresh conversation |
| Conversation List | Browse history by date |
| Model Selector | Choose AI model |
| Message Input | Multi-line text input |
| Send Message | Ctrl+Enter or button |
| Copy Response | Copy AI response |
| Regenerate | Regenerate last response |

---

## Conversation Management

### Creating Conversations

1. Click **"+ New Conversation"** in sidebar
2. Select AI model (optional)
3. Type first message
4. Press Enter or click Send

### Conversation List

- **Today**: Recent conversations
- **Yesterday**: Previous day
- **Last 7 days**: This week
- **Older**: Archived conversations

### Conversation Actions

| Action | Icon | Description |
|--------|------|-------------|
| Rename | ✏️ | Edit conversation title |
| Archive | 📁 | Move to archive |
| Delete | 🗑️ | Permanently delete |
| Export | 📤 | Download as JSON/MD |

---

## Message Features

### User Messages

- Multi-line input support
- Markdown formatting
- Code block syntax highlighting
- Image upload (planned)

### AI Responses

- Streaming responses
- Markdown rendering
- Code syntax highlighting
- Copy to clipboard
- Token count display

### Message Actions

| Action | Description |
|--------|-------------|
| Copy | Copy message text |
| Edit | Edit and resend (user only) |
| Regenerate | Get new response |
| Rate | 👍/👎 feedback |

---

## AI Providers

### Supported Providers

| Provider | Models | Features |
|----------|--------|----------|
| OpenRouter | 50+ models | Unified API, cost-effective |
| OpenAI | GPT-4, GPT-3.5 | Official API |
| Anthropic | Claude 3 family | Direct access |
| Google | Gemini Pro | (via OpenRouter) |

### Model Selection

**Model Selector Dropdown:**

```
┌─────────────────────────────────────┐
│ Provider: OpenRouter            ▼  │
├─────────────────────────────────────┤
│ ★ Claude 3.5 Sonnet (recommended)  │
│   Claude 3 Opus                     │
│   GPT-4 Turbo                       │
│   GPT-4o                            │
│   Gemini 1.5 Pro                    │
└─────────────────────────────────────┘
```

### Configuring Providers

**Admin → AI Providers:**

| Field | Description |
|-------|-------------|
| Provider Name | Display name |
| API Key | Provider API key |
| Base URL | API endpoint (optional) |
| Default Model | Default model ID |
| Enabled | Active/inactive toggle |

---

## Model Configuration

### Model Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Temperature | Response creativity | 0.7 |
| Max Tokens | Response length limit | 4096 |
| Top P | Nucleus sampling | 1.0 |
| Frequency Penalty | Repetition control | 0 |
| Presence Penalty | Topic diversity | 0 |

### Model Tiers

| Tier | Use Case | Models |
|------|----------|--------|
| Fast | Quick responses | GPT-3.5, Claude Haiku |
| Standard | General use | GPT-4, Claude Sonnet |
| Premium | Complex tasks | GPT-4o, Claude Opus |

### Automatic Routing

System can automatically select model based on:
- Query complexity
- User tier/quota
- Provider availability
- Cost optimization

---

## Token Usage & Limits

### Token Tracking

```
┌──────────────────────────────────┐
│ Token Usage (This Month)         │
├──────────────────────────────────┤
│ Input:  125,432 tokens           │
│ Output: 89,234 tokens            │
│ Total:  214,666 tokens           │
│                                  │
│ Limit:  1,000,000 tokens         │
│ Used:   21.5%                    │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░ │
└──────────────────────────────────┘
```

### User Tiers

| Tier | Monthly Limit | Models |
|------|---------------|--------|
| Free | 10,000 tokens | Fast tier only |
| Standard | 100,000 tokens | Fast + Standard |
| Professional | 1,000,000 tokens | All models |
| Enterprise | Unlimited | All models |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Send message |
| `Ctrl + N` | New conversation |
| `Ctrl + /` | Focus search |
| `Escape` | Close modals |
| `↑` / `↓` | Navigate conversations |

---

## API Integration

### Send Message

```http
POST /api/v1/chat/conversations/{id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "How do I configure Redis?",
  "model": "anthropic/claude-3-sonnet"
}
```

### Stream Response

```http
POST /api/v1/chat/completions
Authorization: Bearer {token}
Content-Type: application/json

{
  "conversationId": "uuid",
  "message": "Explain Docker networking",
  "stream": true
}
```

**Response (SSE):**
```
data: {"content": "Docker", "done": false}
data: {"content": " networking", "done": false}
data: {"content": " provides...", "done": false}
data: {"content": "", "done": true, "usage": {"input": 10, "output": 150}}
```

---

## Stats & Analytics

### URL
`/stats`

### Dashboard Widgets

| Widget | Description |
|--------|-------------|
| Daily Usage | Token usage chart |
| Active Conversations | Count by status |
| Top Models | Most used models |
| Response Times | Average latency |
| Cost Breakdown | By provider/model |

### Export Reports

- CSV export for billing
- JSON export for analysis
- Date range selection

---

## Best Practices

1. **Be Specific**: Clear prompts get better responses
2. **Use Context**: Reference previous messages
3. **Select Appropriate Model**: Match complexity to tier
4. **Monitor Usage**: Track token consumption
5. **Archive Old Chats**: Keep workspace clean

## Related

- [Authentication](./AUTH.md) - Login required for chat
- [Models Page](./MODELS.md) - Manage AI models
- [Chat API](../api/CHAT-API.md) - API reference
