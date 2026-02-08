<script lang="ts">
    import { goto } from '$app/navigation'

    type SetupSeedData = {
        skipped?: boolean
    }

    type SetupData = {
        adminUser?: unknown
        systemConfig?: unknown
        aiProviders?: unknown
        seedData?: SetupSeedData | null
        [key: string]: unknown
    }
    
    let { setupData } = $props<{
        setupData: SetupData;
    }>();
    
    let loading = $state(false)
    let error = $state('')
    let completed = $state(false)
    let confetti = $state(false)
    
    $effect(() => {
        // Auto complete setup after a brief delay
        const timeout = setTimeout(completeSetup, 1000)
        return () => clearTimeout(timeout)
    })
    
    async function completeSetup() {
        try {
            loading = true
            error = ''
            
            const response = await fetch('/api/v1/setup/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    setupData: setupData
                })
            })
            
            const result = await response.json()
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to complete setup')
            }
            
            // Mark as completed
            completed = true
            confetti = true
            
            // Hide confetti after 3 seconds
            setTimeout(() => {
                confetti = false
            }, 3000)
            
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to complete setup'
        } finally {
            loading = false
        }
    }
    
    async function goToDashboard() {
        // Navigate to main dashboard
        await goto('/netops/devices')
    }
    
    async function goToLogin() {
        // Navigate to login page
        await goto('/login')
    }
    
    function downloadSetupReport() {
        const report = {
            timestamp: new Date().toISOString(),
            setupData: setupData,
            summary: {
                databaseInitialized: true,
                adminUserCreated: !!setupData.adminUser,
                systemConfigured: !!setupData.systemConfig,
                aiProvidersConfigured: !!setupData.aiProviders,
                seedDataLoaded: !!setupData.seedData && !setupData.seedData.skipped
            }
        }
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { 
            type: 'application/json' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `techcorp-setup-report-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }
    
    // Calculate setup completeness
    const setupStats = $derived({
        total: 5,
        completed: [
            true, // Database
            !!setupData.adminUser,
            !!setupData.systemConfig,
            !!setupData.aiProviders,
            !!setupData.seedData
        ].filter(Boolean).length
    });
    
    const completionPercent = $derived(Math.round((setupStats.completed / setupStats.total) * 100));
</script>

<div class="completion-step">
    {#if confetti}
        <div class="confetti-container">
            {#each Array(50) as _, i}
                <div class="confetti confetti-{i % 5}"></div>
            {/each}
        </div>
    {/if}

    <div class="completion-content">
        {#if loading}
            <!-- Completing Setup -->
            <div class="completion-loading">
                <div class="loading-spinner"></div>
                <h2>🔧 Hoàn tất cài đặt...</h2>
                <p>Đang lưu cấu hình và khởi tạo hệ thống</p>
            </div>
        {:else if error}
            <!-- Error State -->
            <div class="completion-error">
                <div class="error-icon">❌</div>
                <h2>Có lỗi xảy ra</h2>
                <p class="error-message">{error}</p>
                
                <div class="error-actions">
                    <button class="btn btn-primary" onclick={completeSetup}>
                        🔄 Thử lại
                    </button>
                    <button class="btn btn-secondary" onclick={goToLogin}>
                        🏠 Về trang đăng nhập
                    </button>
                </div>
            </div>
        {:else if completed}
            <!-- Success State -->
            <div class="completion-success">
                <div class="success-icon">🎉</div>
                <h1>Chúc mừng! Hệ thống đã sẵn sàng</h1>
                <p class="success-subtitle">TechCorp Vietnam Gateway đã được cài đặt và cấu hình thành công</p>
                
                <!-- Setup Summary -->
                <div class="setup-summary">
                    <div class="summary-header">
                        <h3>📋 Tóm tắt cài đặt</h3>
                        <div class="completion-badge">
                            {completionPercent}% hoàn thành
                        </div>
                    </div>
                    
                    <div class="summary-grid">
                        <div class="summary-item {setupStats.completed >= 1 ? 'completed' : 'pending'}">
                            <span class="item-icon">🗄️</span>
                            <span class="item-text">Database đã khởi tạo</span>
                            <span class="item-status">{setupStats.completed >= 1 ? '✅' : '⏳'}</span>
                        </div>
                        
                        <div class="summary-item {setupData.adminUser ? 'completed' : 'pending'}">
                            <span class="item-icon">👤</span>
                            <span class="item-text">Admin user đã tạo</span>
                            <span class="item-status">{setupData.adminUser ? '✅' : '⏳'}</span>
                        </div>
                        
                        <div class="summary-item {setupData.systemConfig ? 'completed' : 'pending'}">
                            <span class="item-icon">⚙️</span>
                            <span class="item-text">Hệ thống đã cấu hình</span>
                            <span class="item-status">{setupData.systemConfig ? '✅' : '⏳'}</span>
                        </div>
                        
                        <div class="summary-item {setupData.aiProviders ? 'completed' : 'pending'}">
                            <span class="item-icon">🤖</span>
                            <span class="item-text">AI providers đã thiết lập</span>
                            <span class="item-status">{setupData.aiProviders ? '✅' : '❌'}</span>
                        </div>
                        
                        <div class="summary-item {setupData.seedData && !setupData.seedData.skipped ? 'completed' : 'pending'}">
                            <span class="item-icon">🌱</span>
                            <span class="item-text">Dữ liệu mẫu đã tải</span>
                            <span class="item-status">
                                {setupData.seedData?.skipped ? '⏭️' : (setupData.seedData ? '✅' : '❌')}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Login Info -->
                <div class="login-info">
                    <h3>🔐 Thông tin đăng nhập</h3>
                    <div class="login-details">
                        <div class="login-item">
                            <strong>Email:</strong> 
                            <span class="credential">admin@techcorp.vn</span>
                        </div>
                        <div class="login-item">
                            <strong>Password:</strong> 
                            <span class="credential">TechCorp@2024</span>
                        </div>
                    </div>
                    <div class="security-note">
                        <span class="note-icon">⚠️</span>
                        <span>Hãy đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật</span>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <button class="btn btn-primary btn-large" onclick={goToDashboard}>
                        🚀 Vào Dashboard
                    </button>
                    
                    <button class="btn btn-secondary" onclick={goToLogin}>
                        🔑 Đến trang đăng nhập
                    </button>
                    
                    <button class="btn btn-outline" onclick={downloadSetupReport}>
                        📄 Tải báo cáo setup
                    </button>
                </div>

                <!-- Next Steps -->
                <div class="next-steps">
                    <h3>📝 Các bước tiếp theo</h3>
                    <ul class="steps-list">
                        <li>
                            <strong>Đăng nhập hệ thống:</strong> 
                            Sử dụng thông tin admin ở trên để đăng nhập
                        </li>
                        <li>
                            <strong>Đổi mật khẩu:</strong> 
                            Vào Settings → Profile để đổi mật khẩu mặc định
                        </li>
                        <li>
                            <strong>Khám phá dữ liệu mẫu:</strong> 
                            {#if setupData.seedData && !setupData.seedData.skipped}
                                Xem qua Assets, Locations, Users để hiểu cách hệ thống hoạt động
                            {:else}
                                Thêm dữ liệu thực tế của công ty bạn
                            {/if}
                        </li>
                        <li>
                            <strong>Cấu hình bổ sung:</strong> 
                            Kiểm tra Settings để điều chỉnh các tham số theo nhu cầu
                        </li>
                        <li>
                            <strong>Tạo user account:</strong> 
                            Thêm các thành viên khác vào hệ thống
                        </li>
                    </ul>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .completion-step {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        position: relative;
        overflow: hidden;
    }

    .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
    }

    .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: #3b82f6;
        animation: confetti-fall 3s ease-out forwards;
        transform-origin: center;
    }

    .confetti-0 { background-color: #3b82f6; left: 10%; animation-delay: 0s; }
    .confetti-1 { background-color: #ef4444; left: 30%; animation-delay: 0.5s; }
    .confetti-2 { background-color: #10b981; left: 50%; animation-delay: 1s; }
    .confetti-3 { background-color: #f59e0b; left: 70%; animation-delay: 1.5s; }
    .confetti-4 { background-color: #8b5cf6; left: 90%; animation-delay: 2s; }

    @keyframes confetti-fall {
        to {
            transform: translateY(100vh) rotate(360deg);
        }
    }

    .completion-content {
        max-width: 900px;
        width: 100%;
        text-align: center;
    }

    .completion-loading {
        padding: 4rem 2rem;
    }

    .loading-spinner {
        width: 4rem;
        height: 4rem;
        border: 4px solid #e5e7eb;
        border-top: 4px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 2rem auto;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .completion-error {
        padding: 4rem 2rem;
    }

    .error-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }

    .error-message {
        color: #b91c1c;
        margin-bottom: 2rem;
        padding: 1rem;
        background: #fee2e2;
        border-radius: 0.5rem;
        border: 1px solid #fecaca;
    }

    .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .completion-success {
        padding: 2rem;
    }

    .success-icon {
        font-size: 5rem;
        margin-bottom: 1rem;
        animation: bounce 2s infinite;
    }

    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
    }

    .completion-success h1 {
        color: #1f2937;
        margin-bottom: 0.5rem;
        font-size: 2.5rem;
    }

    .success-subtitle {
        color: #6b7280;
        font-size: 1.25rem;
        margin-bottom: 3rem;
    }

    .setup-summary {
        background: white;
        border-radius: 0.75rem;
        padding: 2rem;
        margin-bottom: 2rem;
        border: 1px solid #e5e7eb;
        text-align: left;
    }

    .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .summary-header h3 {
        margin: 0;
        color: #1f2937;
    }

    .completion-badge {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .summary-grid {
        display: grid;
        gap: 0.75rem;
    }

    .summary-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-radius: 0.5rem;
        transition: all 0.2s;
    }

    .summary-item.completed {
        background: #dcfce7;
        border: 1px solid #bbf7d0;
    }

    .summary-item.pending {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
    }

    .item-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .item-text {
        flex: 1;
        color: #374151;
        font-weight: 500;
    }

    .item-status {
        font-size: 1.25rem;
        flex-shrink: 0;
    }

    .login-info {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        text-align: left;
    }

    .login-info h3 {
        color: #0369a1;
        margin-bottom: 1rem;
    }

    .login-details {
        margin-bottom: 1rem;
    }

    .login-item {
        margin-bottom: 0.5rem;
        color: #374151;
    }

    .credential {
        background: #dbeafe;
        color: #1e40af;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-weight: 600;
    }

    .security-note {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #92400e;
        background: #fffbeb;
        padding: 0.75rem;
        border-radius: 0.375rem;
        border: 1px solid #fed7aa;
        font-size: 0.875rem;
    }

    .note-icon {
        flex-shrink: 0;
    }

    .quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
        margin-bottom: 3rem;
    }

    .next-steps {
        background: white;
        border-radius: 0.75rem;
        padding: 2rem;
        border: 1px solid #e5e7eb;
        text-align: left;
    }

    .next-steps h3 {
        color: #1f2937;
        margin-bottom: 1rem;
    }

    .steps-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .steps-list li {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
        position: relative;
        line-height: 1.6;
        color: #374151;
    }

    .steps-list li::before {
        content: "→";
        position: absolute;
        left: 0;
        color: #3b82f6;
        font-weight: bold;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.375rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
    }

    .btn-large {
        padding: 1rem 2rem;
        font-size: 1rem;
    }

    .btn-primary {
        background-color: #3b82f6;
        color: white;
    }

    .btn-primary:hover {
        background-color: #2563eb;
    }

    .btn-secondary {
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
        background-color: #e5e7eb;
    }

    .btn-outline {
        background-color: transparent;
        color: #3b82f6;
        border: 1px solid #3b82f6;
    }

    .btn-outline:hover {
        background-color: #3b82f6;
        color: white;
    }
</style>
