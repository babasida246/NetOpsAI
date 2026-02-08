<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import FirstTimeSetup from '$lib/components/setup/FirstTimeSetup.svelte';

	let checking = $state(true);
	let needsSetup = $state(true);
	let error = $state<string | null>(null);
	let setupCompleted = $state(false);
	let canModify = $state(false); // Allow modifying setup after completion

	$effect(() => {
		void checkSetupStatus();
	});

	async function checkSetupStatus() {
		try {
			checking = true;
			error = null;

			const response = await fetch('/api/v1/setup/status');
			
			if (!response.ok) {
				// If setup API is not available, assume setup is needed
				if (response.status === 404) {
					needsSetup = true;
					return;
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const status = await response.json();
			
			if (status.data && status.data.isComplete) {
				// Setup is completed, redirect to login (they should login instead of setup)
				setupCompleted = true;
				needsSetup = false;
				
				if (browser) {
					// Setup already completed, redirect to chat
					goto('/login', { replaceState: true });
				}
			} else {
				// Setup not complete, show setup wizard
				needsSetup = true;
			}
		} catch (err) {
			console.error('Setup status check failed:', err);
			error = err instanceof Error ? err.message : 'Failed to check setup status';
			needsSetup = true; // Assume setup is needed if check fails
		} finally {
			checking = false;
		}
	}

	async function handleResetSystem() {
		if (!confirm('Are you sure you want to reset the entire system? This will delete all data and return to initial setup.')) {
			return;
		}

		try {
			const response = await fetch('/api/v1/setup/reset-database', {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('authToken')}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to reset system');
			}

			// Clear local storage
			localStorage.clear();

			// Reload page to start fresh setup
			window.location.href = '/setup';
		} catch (err) {
			alert('Failed to reset system: ' + (err instanceof Error ? err.message : 'Unknown error'));
		}
	}

</script>

<svelte:head>
	<title>System Setup - NetOpsAI Gateway</title>
	<meta name="description" content="NetOpsAI Gateway first time setup wizard" />
</svelte:head>

{#if checking}
	<!-- Loading State -->
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<h2 class="text-lg font-medium text-gray-900 mb-2">Checking system status...</h2>
			<p class="text-gray-500">Please wait while we verify the system setup.</p>
		</div>
	</div>
{:else if error && !needsSetup}
	<!-- Error State -->
	<div class="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
		<div class="text-center max-w-md mx-auto px-4">
			<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
			</div>
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Setup Check Failed</h2>
			<p class="text-gray-600 mb-6">{error}</p>
			<div class="space-y-3">
				<button 
					onclick={checkSetupStatus}
					class="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Retry
				</button>
				<button 
					onclick={() => needsSetup = true}
					class="w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
				>
					Proceed with Setup
				</button>
			</div>
		</div>
	</div>
{:else if needsSetup}
	<!-- Setup Wizard -->
	<FirstTimeSetup />
{:else if setupCompleted && canModify}
	<!-- Setup Completed - Configuration Management -->
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
		<div class="max-w-4xl mx-auto">
			<div class="bg-white rounded-lg shadow-lg p-8">
				<div class="mb-8">
					<h1 class="text-3xl font-bold text-gray-900 mb-2">System Configuration</h1>
					<p class="text-gray-600">Manage system settings and configuration</p>
				</div>

				<div class="space-y-6">
					<!-- Setup Status -->
					<div class="bg-green-50 border border-green-200 rounded-lg p-6">
						<div class="flex items-start">
							<svg class="w-6 h-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<div class="ml-3">
								<h3 class="text-lg font-medium text-green-900">System Setup Completed</h3>
								<p class="text-green-700 mt-1">Your system is fully configured and operational.</p>
							</div>
						</div>
					</div>

					<!-- Configuration Sections -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Database Configuration -->
						<div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
							<div class="flex items-center mb-4">
								<svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
								</svg>
								<h3 class="ml-3 text-lg font-semibold text-gray-900">Database</h3>
							</div>
							<p class="text-gray-600 mb-4">Configure database connection settings</p>
							<button class="text-blue-600 hover:text-blue-700 font-medium">
								Manage Settings →
							</button>
						</div>

						<!-- Redis Configuration -->
						<div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
							<div class="flex items-center mb-4">
								<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"></path>
								</svg>
								<h3 class="ml-3 text-lg font-semibold text-gray-900">Redis Cache</h3>
							</div>
							<p class="text-gray-600 mb-4">Configure Redis cache connection</p>
							<button class="text-blue-600 hover:text-blue-700 font-medium">
								Manage Settings →
							</button>
						</div>

						<!-- Admin Password -->
						<div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
							<div class="flex items-center mb-4">
								<svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
								</svg>
								<h3 class="ml-3 text-lg font-semibold text-gray-900">Admin Password</h3>
							</div>
							<p class="text-gray-600 mb-4">Change administrator password</p>
							<button class="text-blue-600 hover:text-blue-700 font-medium">
								Change Password →
							</button>
						</div>

						<!-- System Settings -->
						<div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
							<div class="flex items-center mb-4">
								<svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
								</svg>
								<h3 class="ml-3 text-lg font-semibold text-gray-900">System Settings</h3>
							</div>
							<p class="text-gray-600 mb-4">Configure general system settings</p>
							<button class="text-blue-600 hover:text-blue-700 font-medium">
								Manage Settings →
							</button>
						</div>
					</div>

					<!-- Danger Zone -->
					<div class="border-2 border-red-200 rounded-lg p-6 bg-red-50">
						<h3 class="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
						<p class="text-red-700 mb-4">Reset the system to factory defaults. This action cannot be undone.</p>
						<button 
							onclick={handleResetSystem}
							class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
						>
							Reset System to Default
						</button>
					</div>

					<!-- Back to Dashboard -->
					<div class="flex justify-center pt-4">
						<a 
							href="/chat"
							class="text-blue-600 hover:text-blue-700 font-medium flex items-center"
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
							</svg>
							Back to Dashboard
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Fallback (shouldn't reach here normally) -->
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h2>
			<p class="text-gray-500">Please wait while we redirect you to the appropriate page.</p>
		</div>
	</div>
{/if}