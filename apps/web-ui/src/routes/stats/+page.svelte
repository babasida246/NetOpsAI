<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Badge, Spinner, Button } from 'flowbite-svelte';
  import { TrendingUp, DollarSign, Zap, MessageSquare, Calendar } from 'lucide-svelte';
  import { getUserStats, getDailySummary, type UserTokenStats, type DailySummary } from '$lib/api/chat';

  let stats = $state<UserTokenStats[]>([]);
  let dailySummary = $state<DailySummary | null>(null);
  let loading = $state(false);
  let selectedPeriod = $state<'today' | 'week' | 'month'>('week');

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    try {
      const now = new Date();
      let startDate: Date | undefined;

      if (selectedPeriod === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (selectedPeriod === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (selectedPeriod === 'month') {
        startDate = new Date(now.setDate(now.getDate() - 30));
      }

      const [statsRes, summaryRes] = await Promise.all([
        getUserStats({
          startDate: startDate?.toISOString(),
          endDate: new Date().toISOString()
        }),
        getDailySummary()
      ]);

      stats = statsRes.data;
      dailySummary = summaryRes;
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      loading = false;
    }
  }

  // Aggregate stats by model (reactive)
  let modelStats = $state<Record<string, {
    model: string
    provider: string
    totalTokens: number
    totalCost: number
    messageCount: number
    conversationCount: number
  }>>({});

  let modelStatsArray = $state<Array<{
    model: string
    provider: string
    totalTokens: number
    totalCost: number
    messageCount: number
    conversationCount: number
  }>>([]);

  let totalStats = $state({ tokens: 0, cost: 0, messages: 0, conversations: 0 });

  $effect(() => {
    modelStats = stats.reduce((acc, stat) => {
      if (!acc[stat.model]) {
        acc[stat.model] = {
          model: stat.model,
          provider: stat.provider,
          totalTokens: 0,
          totalCost: 0,
          messageCount: 0,
          conversationCount: 0
        };
      }
      acc[stat.model].totalTokens += stat.totalTokens;
      acc[stat.model].totalCost += stat.totalCost;
      acc[stat.model].messageCount += stat.messageCount;
      acc[stat.model].conversationCount += stat.conversationCount;
      return acc;
    }, {} as Record<string, {
      model: string
      provider: string
      totalTokens: number
      totalCost: number
      messageCount: number
      conversationCount: number
    }>);

    modelStatsArray = Object.values(modelStats).sort((a, b) => b.totalCost - a.totalCost);

    totalStats = {
      tokens: stats.reduce((sum, s) => sum + s.totalTokens, 0),
      cost: stats.reduce((sum, s) => sum + s.totalCost, 0),
      messages: stats.reduce((sum, s) => sum + s.messageCount, 0),
      conversations: new Set(stats.map(s => `${s.userId}-${s.date}`)).size
    };
  });

  function formatCurrency(value: number): string {
    return `$${value.toFixed(4)}`;
  }

  function formatNumber(value: number): string {
    return value.toLocaleString();
  }
</script>

<div class="container mx-auto p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Usage Statistics</h1>
    <p class="text-gray-600 dark:text-gray-400">Track your AI usage, costs, and performance metrics</p>
  </div>

  <!-- Period Selector -->
  <div class="mb-6 flex gap-2">
    <Button 
      color={selectedPeriod === 'today' ? 'blue' : 'light'}
      size="sm"
      onclick={() => { selectedPeriod = 'today'; loadData(); }}
    >
      Today
    </Button>
    <Button 
      color={selectedPeriod === 'week' ? 'blue' : 'light'}
      size="sm"
      onclick={() => { selectedPeriod = 'week'; loadData(); }}
    >
      Last 7 Days
    </Button>
    <Button 
      color={selectedPeriod === 'month' ? 'blue' : 'light'}
      size="sm"
      onclick={() => { selectedPeriod = 'month'; loadData(); }}
    >
      Last 30 Days
    </Button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner size="12" />
    </div>
  {:else}
    <!-- Summary Cards -->
    {#if dailySummary}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Tokens</h3>
            <TrendingUp class="w-5 h-5 text-blue-600" />
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(dailySummary.totalTokens)}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {dailySummary.modelsUsed} models used
          </p>
        </Card>

        <Card class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Cost</h3>
            <DollarSign class="w-5 h-5 text-green-600" />
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(dailySummary.totalCost)}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            ${(dailySummary.totalCost / dailySummary.totalMessages).toFixed(6)}/msg
          </p>
        </Card>

        <Card class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Messages</h3>
            <MessageSquare class="w-5 h-5 text-purple-600" />
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {formatNumber(dailySummary.totalMessages)}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {Math.round(dailySummary.totalTokens / dailySummary.totalMessages)} tokens/msg avg
          </p>
        </Card>

        <Card class="p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Period Total</h3>
            <Calendar class="w-5 h-5 text-orange-600" />
          </div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalStats.cost)}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {formatNumber(totalStats.tokens)} tokens
          </p>
        </Card>
      </div>
    {/if}

    <!-- Usage by Model -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Usage by Model</h2>
      
      {#if modelStatsArray.length === 0}
        <Card class="p-8">
          <div class="text-center text-gray-500">
            No usage data for selected period
          </div>
        </Card>
      {:else}
        <div class="grid gap-4">
          {#each modelStatsArray as modelStat}
            <Card class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                      {modelStat.model}
                    </h3>
                    <Badge color="blue">{modelStat.provider}</Badge>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span class="text-gray-500">Tokens:</span>
                      <span class="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatNumber(modelStat.totalTokens)}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-500">Cost:</span>
                      <span class="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(modelStat.totalCost)}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-500">Messages:</span>
                      <span class="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatNumber(modelStat.messageCount)}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-500">Avg Cost/Msg:</span>
                      <span class="ml-2 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(modelStat.totalCost / modelStat.messageCount)}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Cost percentage bar -->
                <div class="ml-4">
                  <div class="text-right text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {((modelStat.totalCost / totalStats.cost) * 100).toFixed(1)}%
                  </div>
                  <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-blue-600"
                      style="width: {(modelStat.totalCost / totalStats.cost) * 100}%"
                    ></div>
                  </div>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Daily Breakdown -->
    {#if stats.length > 0}
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Daily Breakdown</h2>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th class="px-6 py-3">Date</th>
                <th class="px-6 py-3">Model</th>
                <th class="px-6 py-3">Provider</th>
                <th class="px-6 py-3">Tokens</th>
                <th class="px-6 py-3">Messages</th>
                <th class="px-6 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {#each stats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as stat}
                <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {new Date(stat.date).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4">{stat.model}</td>
                  <td class="px-6 py-4">
                    <Badge color="blue" class="text-xs">{stat.provider}</Badge>
                  </td>
                  <td class="px-6 py-4">{formatNumber(stat.totalTokens)}</td>
                  <td class="px-6 py-4">{formatNumber(stat.messageCount)}</td>
                  <td class="px-6 py-4 font-medium">{formatCurrency(stat.totalCost)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>
