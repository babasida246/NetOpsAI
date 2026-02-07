<script lang="ts">
	import { fade } from 'svelte/transition';

	let {
		setupStatus,
		setupData,
		oncomplete
	} = $props<{
		setupStatus: any;
		setupData: any;
		oncomplete?: (data: { nextStep: number; reload?: boolean }) => void;
	}>();

	let checking = $state(false);
	let error = $state<string | null>(null);
	let result = $state<any>(null);

	$effect(() => {
		// Auto-check database if not already completed
		if (setupStatus?.steps?.database?.status !== 'completed') {
			checkDatabase();
		}
	});

	async function checkDatabase() {
		try {
			checking = true;
			error = null;

			const response = await fetch('/api/setup/database', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
			}

			const payload = await response.json();
			result = payload.data || payload;

			if (setupData) {
				setupData.database = result;
			}

			// Move to next step after successful database initialization
			setTimeout(() => {
				oncomplete?.({ nextStep: 2, reload: true });
			}, 1000);

		} catch (err) {
			console.error('Database setup failed:', err);
			error = err instanceof Error ? err.message : 'Database setup failed';
		} finally {
			checking = false;
		}
	}

	const isCompleted = $derived(setupStatus?.steps?.database?.status === 'completed');
	const hasError = $derived(setupStatus?.steps?.database?.status === 'error' || error);
</script>

<div class="space-y-6">
	<!-- Status Display -->
	{#if isCompleted}
		<div class="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg" transition:fade>
			<div class="flex-shrink-0">
				<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
				</svg>
			</div>
			<div>
				<h3 class="text-green-800 font-medium">Database đã được khởi tạo thành công</h3>
				<p class="text-green-700 text-sm mt-1">
					Kết nối database hoạt động bình thường và các bảng đã được tạo.
				</p>
			</div>
		</div>

		<div class="flex justify-end">
			<button 
				onclick={() => oncomplete?.({ nextStep: 2 })}
				class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
			>
				Tiếp tục →
			</button>
		</div>
	{:else if hasError}
		<div class="space-y-4">
			<div class="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg" transition:fade>
				<div class="flex-shrink-0 mt-0.5">
					<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
					</svg>
				</div>
				<div>
					<h3 class="text-red-800 font-medium">Lỗi kết nối database</h3>
					<p class="text-red-700 text-sm mt-1">
						{error || setupStatus?.steps?.database?.error || 'Không thể kết nối với database'}
					</p>
				</div>
			</div>

			<div class="flex space-x-3">
				<button 
					onclick={checkDatabase}
					disabled={checking}
					class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					{checking ? 'Đang kiểm tra...' : 'Thử lại'}
				</button>
			</div>
		</div>
	{:else if checking}
		<div class="space-y-4">
			<div class="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg" transition:fade>
				<div class="flex-shrink-0">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
				</div>
				<div>
					<h3 class="text-blue-800 font-medium">Đang kiểm tra database...</h3>
					<p class="text-blue-700 text-sm mt-1">
						Kiểm tra kết nối và khởi tạo schema database.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Initial State -->
		<div class="space-y-6">
			<div class="text-center py-8">
				<div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
					</svg>
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Thiết lập cơ sở dữ liệu</h3>
				<p class="text-gray-600 max-w-lg mx-auto">
					Bước này sẽ kiểm tra kết nối database và khởi tạo các bảng cần thiết cho hệ thống.
				</p>
			</div>

			<!-- Database Info -->
			{#if setupStatus?.systemInfo?.database}
				<div class="bg-gray-50 rounded-lg p-4">
					<h4 class="font-medium text-gray-900 mb-3">Thông tin Database</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Loại:</span>
							<span class="ml-2 font-medium">{setupStatus.systemInfo.database.type}</span>
						</div>
						<div class="flex items-center">
							<span class="text-gray-500">Trạng thái:</span>
							<div class="ml-2 flex items-center space-x-1">
								<div class="w-2 h-2 rounded-full {setupStatus.systemInfo.database.connected ? 'bg-green-500' : 'bg-red-500'}"></div>
								<span class="font-medium">
									{setupStatus.systemInfo.database.connected ? 'Đã kết nối' : 'Chưa kết nối'}
								</span>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex justify-between">
				<div class="text-sm text-gray-500">
					Database sẽ được kiểm tra và khởi tạo tự động.
				</div>
				<button 
					onclick={checkDatabase}
					class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Bắt đầu kiểm tra
				</button>
			</div>
		</div>
	{/if}

	<!-- Results Display -->
	{#if result}
		<div class="mt-6 p-4 bg-gray-50 rounded-lg" transition:fade>
			<h4 class="font-medium text-gray-900 mb-2">Kết quả khởi tạo:</h4>
			<div class="text-sm space-y-1">
				<div>✅ <span class="text-green-600">Kết nối database thành công</span></div>
				{#if result.tablesCount}
					<div>📊 <span class="text-gray-600">Số bảng: {result.tablesCount}</span></div>
				{/if}
				{#if result.migrationsRun}
					<div>🔄 <span class="text-gray-600">Migrations đã chạy: {result.migrationsRun}</span></div>
				{/if}
				<div class="mt-2 text-green-600 font-medium">{result.message}</div>
			</div>
		</div>
	{/if}
</div>
