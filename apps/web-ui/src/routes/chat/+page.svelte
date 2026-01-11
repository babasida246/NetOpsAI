<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button, Spinner, Badge } from 'flowbite-svelte';
  import { Send, MessageSquarePlus, Trash2, TrendingUp, DollarSign } from 'lucide-svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import type { Conversation, Message } from '$lib/api/conversations';
  import {
    listConversations,
    createConversation,
    deleteConversation,
    listMessages
  } from '$lib/api/conversations';
  import {
    sendChatMessage,
    getDailySummary,
    listModels,
    type DailySummary,
    type ModelConfig
  } from '$lib/api/chat';
  import { getStoredTokens } from '$lib/api/httpClient';

  type ModelOption = {
    id: string;
    label: string;
    provider: string;
  };

  let conversations = $state<Conversation[]>([]);
  let selectedConversationId = $state<string | null>(null);
  let messages = $state<Message[]>([]);
  let inputMessage = $state('');
  let loading = $state(false);
  let sendingMessage = $state(false);
  let messagesContainer: HTMLDivElement | null = $state(null);
  let dailyStats = $state<DailySummary | null>(null);
  let selectedModel = $state('openai/gpt-4o-mini');
  let models = $state<ModelConfig[]>([]);

  const fallbackModels: ModelOption[] = [
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)', provider: 'openai' },
    { id: 'openai/gpt-4o', label: 'GPT-4o (Balanced)', provider: 'openai' },
    { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', provider: 'anthropic' },
    { id: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet', provider: 'anthropic' },
    { id: 'google/gemini-pro', label: 'Gemini Pro', provider: 'google' }
  ];

  const modelOptions = $derived<ModelOption[]>(
    models.length > 0
      ? models
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map<ModelOption>((model) => ({
          id: model.id,
          label: model.description || model.id,
          provider: model.provider
        }))
      : fallbackModels
  );

  const selectedModelInfo = $derived(modelOptions.find(model => model.id === selectedModel));

  // Load conversations on mount
  onMount(async () => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      goto(`/login?redirect=${encodeURIComponent('/chat')}`);
      return;
    }
    await Promise.all([
      loadConversations(),
      loadDailyStats(),
      loadModels()
    ]);
  });

  async function loadConversations() {
    try {
      loading = true;
      const response = await listConversations();
      conversations = response.data;
      
      // Auto-select first conversation
      if (conversations.length > 0 && !selectedConversationId) {
        await selectConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      loading = false;
    }
  }

  async function loadDailyStats() {
    try {
      dailyStats = await getDailySummary();
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadModels() {
    try {
      const response = await listModels();
      const sorted = response.data.sort((a, b) => a.priority - b.priority);
      models = sorted;

      if (sorted.length > 0 && !sorted.some(model => model.id === selectedModel)) {
        selectedModel = sorted[0].id;
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  async function selectConversation(id: string) {
    try {
      selectedConversationId = id;
      loading = true;
      const response = await listMessages(id);
      messages = response.data;
      scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      loading = false;
    }
  }

  async function createNewConversation() {
    try {
      const conversation = await createConversation({ title: 'New Chat' });
      conversations = [conversation, ...conversations];
      await selectConversation(conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }

  async function deleteCurrentConversation() {
    if (!selectedConversationId) return;
    
    try {
      await deleteConversation(selectedConversationId);
      conversations = conversations.filter(c => c.id !== selectedConversationId);
      selectedConversationId = null;
      messages = [];
      
      if (conversations.length > 0) {
        await selectConversation(conversations[0].id);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  async function handleSendMessage() {
    if (!inputMessage.trim() || sendingMessage) return;

    const userMessageContent = inputMessage.trim();
    inputMessage = '';
    sendingMessage = true;

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversationId || '',
      role: 'user',
      content: userMessageContent,
      createdAt: new Date().toISOString()
    };
    messages = [...messages, tempUserMessage];
    scrollToBottom();

    try {
      // Send message via new integrated chat API
      const result = await sendChatMessage({
        message: userMessageContent,
        conversationId: selectedConversationId || undefined,
        model: selectedModel
      });

      // If new conversation was created, update state
      if (!selectedConversationId) {
        selectedConversationId = result.conversationId;
        await loadConversations();
      }

      // Replace temp message and add assistant response
      const messagesResponse = await listMessages(result.conversationId);
      messages = messagesResponse.data;
      
      // Update stats
      await loadDailyStats();
      
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      messages = messages.filter(m => m.id !== tempUserMessage.id);
    } finally {
      sendingMessage = false;
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  $effect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  });
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
  <div class="page-shell py-6 lg:py-8">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <p class="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300 font-semibold">Chat workspace</p>
        <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">NetOpsAI Conversations</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Fast chat workspace with cost and model controls.</p>
      </div>
      <div class="flex gap-2">
        <Button onclick={createNewConversation} color="blue" size="sm">
          <MessageSquarePlus class="w-4 h-4 mr-2" />
          New chat
        </Button>
        <Button onclick={deleteCurrentConversation} color="red" size="sm" disabled={!selectedConversationId}>
          <Trash2 class="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>

    {#if dailyStats}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tokens</span>
            <TrendingUp class="w-4 h-4 text-blue-600" />
          </div>
          <div class="text-xl font-semibold text-slate-900 dark:text-white mt-2">
            {dailyStats.totalTokens.toLocaleString()}
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm">
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cost</span>
            <DollarSign class="w-4 h-4 text-emerald-600" />
          </div>
          <div class="text-xl font-semibold text-slate-900 dark:text-white mt-2">
            ${dailyStats.totalCost.toFixed(4)}
          </div>
          <p class="text-xs text-slate-500 mt-1">Across {dailyStats.modelsUsed} models</p>
        </div>
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm">
          <div class="text-xs text-slate-500 dark:text-slate-400">Messages</div>
          <div class="text-xl font-semibold text-slate-900 dark:text-white mt-2">
            {dailyStats.totalMessages}
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm">
          <div class="text-xs text-slate-500 dark:text-slate-400">Active model</div>
          <div class="flex items-center gap-2 mt-2">
            <Badge color="blue">{selectedModelInfo?.provider || 'model'}</Badge>
            <span class="text-sm text-slate-900 dark:text-white truncate">{selectedModelInfo?.label || selectedModel}</span>
          </div>
        </div>
      </div>
    {/if}

    <div class="grid lg:grid-cols-[320px,1fr] gap-4 lg:gap-6">
      <!-- Conversations -->
      <div class="bg-white/90 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-500">Conversations</p>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{conversations.length} threads</p>
          </div>
          {#if loading && conversations.length === 0}
            <Spinner size="5" />
          {/if}
        </div>
        <div class="max-h-[70vh] overflow-y-auto">
          {#if loading && conversations.length === 0}
            <div class="p-6 flex justify-center">
              <Spinner size="8" />
            </div>
          {:else if conversations.length === 0}
            <div class="p-6 text-center text-slate-500">
              No conversations yet
            </div>
          {:else}
            {#each conversations as conversation}
              <button
                onclick={() => selectConversation(conversation.id)}
                class="w-full text-left px-4 py-3 flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 {selectedConversationId === conversation.id ? 'bg-blue-50/70 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700' : ''}"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium text-slate-900 dark:text-white truncate">
                    {conversation.title || 'Untitled Chat'}
                  </span>
                  <span class="text-[11px] text-slate-500">{new Date(conversation.updatedAt).toLocaleDateString()}</span>
                </div>
                <p class="text-xs text-slate-500 line-clamp-2">{conversation.id}</p>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Chat panel -->
      <div class="bg-white/95 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 lg:p-6 flex flex-col gap-4">
        {#if selectedConversationId}
          <div class="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <p class="text-xs text-slate-500">Conversation</p>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {conversations.find(c => c.id === selectedConversationId)?.title || 'Chat'}
              </h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <select
                bind:value={selectedModel}
                class="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-inner"
              >
                {#each modelOptions as model}
                  <option value={model.id}>{model.label}</option>
                {/each}
              </select>
              <Badge color="blue" class="text-xs self-center">
                {selectedModelInfo?.provider || selectedModel.split('/')[0]}
              </Badge>
            </div>
          </div>

          <div class="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-3 lg:p-4 shadow-inner min-h-[55vh] flex flex-col">
            <div
              bind:this={messagesContainer}
              class="flex-1 overflow-y-auto pr-1 space-y-4"
            >
              {#if loading && messages.length === 0}
                <div class="flex items-center justify-center h-full py-10">
                  <Spinner size="12" />
                </div>
              {:else if messages.length === 0}
                <div class="flex items-center justify-center h-full text-slate-500">
                  Start the conversation with a message.
                </div>
              {:else}
                {#each messages as message (message.id)}
                  <ChatMessage {message} />
                {/each}
                
                {#if sendingMessage}
                  <div class="flex gap-4 mb-4">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700">
                        <Spinner size="4" color="white" />
                      </div>
                    </div>
                    <div class="flex-1">
                      <div class="text-slate-500 dark:text-slate-400">Thinking...</div>
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex gap-3 items-start">
              <textarea
                bind:value={inputMessage}
                onkeydown={handleKeyPress}
                disabled={sendingMessage}
                placeholder="Type your message..."
                class="flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 shadow-inner"
                rows="3"
              ></textarea>
              <Button
                onclick={handleSendMessage}
                disabled={!inputMessage.trim() || sendingMessage}
                color="blue"
                class="h-12 self-stretch"
              >
                <Send class="w-5 h-5" />
              </Button>
            </div>
            <div class="text-xs text-slate-500">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        {:else}
          <div class="flex flex-1 flex-col items-center justify-center py-10 text-slate-500">
            <MessageSquarePlus class="w-12 h-12 mb-3 text-slate-400" />
            <p class="text-base font-semibold">No conversations yet</p>
            <p class="text-sm text-slate-500">Create a new chat to begin.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
