<script lang="ts">
  import { onMount } from 'svelte';
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
  import { sendChatMessage, getDailySummary, type DailySummary } from '$lib/api/chat';

  let conversations = $state<Conversation[]>([]);
  let selectedConversationId = $state<string | null>(null);
  let messages = $state<Message[]>([]);
  let inputMessage = $state('');
  let loading = $state(false);
  let sendingMessage = $state(false);
  let messagesContainer: HTMLDivElement | null = $state(null);
  let dailyStats = $state<DailySummary | null>(null);
  let selectedModel = $state('openai/gpt-4o-mini');

  // Load conversations on mount
  onMount(async () => {
    await loadConversations();
    await loadDailyStats();
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

<div class="flex h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Sidebar - Conversations List -->
  <div class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
    <!-- Daily Stats Header -->
    {#if dailyStats}
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Today's Usage</div>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-white dark:bg-gray-700 rounded-lg p-2">
            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <TrendingUp class="w-3 h-3" />
              <span>Tokens</span>
            </div>
            <div class="font-bold text-sm text-gray-900 dark:text-white">
              {dailyStats.totalTokens.toLocaleString()}
            </div>
          </div>
          <div class="bg-white dark:bg-gray-700 rounded-lg p-2">
            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <DollarSign class="w-3 h-3" />
              <span>Cost</span>
            </div>
            <div class="font-bold text-sm text-gray-900 dark:text-white">
              ${dailyStats.totalCost.toFixed(4)}
            </div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {dailyStats.totalMessages} messages · {dailyStats.modelsUsed} models
        </div>
      </div>
    {/if}

    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <Button onclick={createNewConversation} class="w-full" color="blue">
        <MessageSquarePlus class="w-4 h-4 mr-2" />
        New Chat
      </Button>
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if loading && conversations.length === 0}
        <div class="flex items-center justify-center p-8">
          <Spinner size="8" />
        </div>
      {:else if conversations.length === 0}
        <div class="p-4 text-center text-gray-500">
          No conversations yet
        </div>
      {:else}
        {#each conversations as conversation}
          <button
            onclick={() => selectConversation(conversation.id)}
            class="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 transition-colors {selectedConversationId === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''}"
          >
            <div class="font-medium text-gray-900 dark:text-gray-100 truncate">
              {conversation.title || 'Untitled Chat'}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {new Date(conversation.updatedAt).toLocaleDateString()}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Main Chat Area -->
  <div class="flex-1 flex flex-col">
    {#if selectedConversationId}
      <!-- Chat Header -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {conversations.find(c => c.id === selectedConversationId)?.title || 'Chat'}
        </h2>
        <Button onclick={deleteCurrentConversation} color="red" size="sm">
          <Trash2 class="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>

      <!-- Messages -->
      <div
        bind:this={messagesContainer}
        class="flex-1 overflow-y-auto px-6 py-4"
      >
        {#if loading && messages.length === 0}
          <div class="flex items-center justify-center h-full">
            <Spinner size="12" />
          </div>
        {:else if messages.length === 0}
          <div class="flex items-center justify-center h-full text-gray-500">
            Start a conversation by sending a message
          </div>
        {:else}
          {#each messages as message (message.id)}
            <ChatMessage {message} />
          {/each}
          
          {#if sendingMessage}
            <div class="flex gap-4 mb-6">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-700">
                  <Spinner size="4" color="white" />
                </div>
              </div>
              <div class="flex-1">
                <div class="text-gray-500 dark:text-gray-400">Thinking...</div>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Input Area -->
      <div class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <!-- Model Selector -->
        <div class="flex gap-2 mb-3">
          <select
            bind:value={selectedModel}
            class="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-gray-900 dark:text-gray-100"
          >
            <option value="openai/gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
            <option value="openai/gpt-4o">GPT-4o (Balanced)</option>
            <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="google/gemini-pro">Gemini Pro</option>
          </select>
          <Badge color="blue" class="text-xs">
            {selectedModel.split('/')[0]}
          </Badge>
        </div>

        <div class="flex gap-4 items-end">
          <textarea
            bind:value={inputMessage}
            onkeydown={handleKeyPress}
            disabled={sendingMessage}
            placeholder="Type your message..."
            class="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            rows="3"
          ></textarea>
          <Button
            onclick={handleSendMessage}
            disabled={!inputMessage.trim() || sendingMessage}
            color="blue"
            class="h-12"
          >
            <Send class="w-5 h-5" />
          </Button>
        </div>
        <div class="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    {:else}
      <!-- No conversation selected -->
      <div class="flex-1 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <MessageSquarePlus class="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p class="text-lg">Select a conversation or create a new one</p>
        </div>
      </div>
    {/if}
  </div>
</div>
