<script lang="ts">
  import { onMount } from 'svelte';
  import { Card, Badge, Spinner, Button } from 'flowbite-svelte';
  import { TrendingUp, DollarSign, Zap, MessageSquare, Calendar } from 'lucide-svelte';
  import { getUserStats, getDailySummary, type UserTokenStats, type DailySummary } from '$lib/api/chat';

  let stats = $state<UserTokenStats[]>([]);
  let dailySummary = $state<DailySummary | null>(null);
  let loading = $state(false);
  let selectedPeriod = $state<'today' | 'week' | 'month'>('week');

  const periodLabel = $derived(() => {
    if (selectedPeriod === 'today') return 'Today';
    if (selectedPeriod === 'week') return 'Last 7 days';
    return 'Last 30 days';
  });

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
  const modelStats = $derived.by(() => {
    return stats.reduce((acc, stat) => {
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
  });

  const modelStatsArray = $derived(Object.values(modelStats).sort((a, b) => b.totalCost - a.totalCost));

  const totalStats = $derived({
    tokens: stats.reduce((sum, s) => sum + s.totalTokens, 0),
    cost: stats.reduce((sum, s) => sum + s.totalCost, 0),
    messages: stats.reduce((sum, s) => sum + s.messageCount, 0),
    conversations: new Set(stats.map(s => `${s.userId}-${s.date}`)).size
  });

  function formatCurrency(value: number): string {
    return `$${value.toFixed(4)}`;
  }

  function formatNumber(value: number): string {
    return value.toLocaleString();
  }
</script>

<div class="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
  <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-wide text-blue-200 font-semibold">Usage insights</p>
        <h1 class="text-3xl font-bold">AI Statistics & Cost</h1>
        <p class="text-sm text-blue-100/80 mt-2">Usage, cost, and volume by model.</p>
      </div>
      <div class="flex gap-2">
        <Badge color="blue" class="bg-white/10 text-white border-white/20">{periodLabel}</Badge>
        <Badge color="light" class="bg-white/10 text-white border-white/20">
          {stats.length} records
        </Badge>
      </div>
    </div>
  </div>

  <div class="bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
    <div class="flex flex-wrap gap-2 px-4 lg:px-6 py-3 border-b border-slate-200 dark:border-slate-800">
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

    <div class="p-4 lg:p-6">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <Spinner size="12" />
        </div>
      {:else}
        <!-- Summary Cards -->
        {#if dailySummary}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card class="p-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
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

            <Card class="p-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Cost</h3>
                <DollarSign class="w-5 h-5 text-green-600" />
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(dailySummary.totalCost)}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                ${(dailySummary.totalMessages ? (dailySummary.totalCost / dailySummary.totalMessages) : 0).toFixed(6)}/msg
              </p>
            </Card>

            <Card class="p-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">Messages</h3>
                <MessageSquare class="w-5 h-5 text-purple-600" />
              </div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(dailySummary.totalMessages)}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {dailySummary.totalMessages ? Math.round(dailySummary.totalTokens / dailySummary.totalMessages) : 0} tokens/msg avg
              </p>
            </Card>

            <Card class="p-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
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
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Usage by Model</h2>
            <Badge color="blue" class="text-xs">Top spend</Badge>
          </div>
          
          {#if modelStatsArray.length === 0}
            <Card class="p-8 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              <div class="text-center text-gray-500">
                No usage data for selected period
              </div>
            </Card>
          {:else}
            <div class="grid gap-4">
              {#each modelStatsArray as modelStat}
                <Card class="p-4 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
                  <div class="flex items-center justify-between gap-4 flex-wrap">
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
                    <div class="ml-4 min-w-[120px]">
                      <div class="text-right text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {((modelStat.totalCost / totalStats.cost) * 100).toFixed(1)}%
                      </div>
                      <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Daily Breakdown</h2>
              <Badge color="light" class="text-xs">{stats.length} entries</Badge>
            </div>
            
            <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
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
                    <tr class="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
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
  </div>
</div>
