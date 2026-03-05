<script lang="ts">
    import { locale } from '$lib/i18n'

    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
    ]

    let currentLocale = $state('en')
    locale.subscribe((value) => {
        if (value) currentLocale = value
    })

    function changeLanguage(lang: string) {
        locale.set(lang)
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('locale', lang)
        }
    }

    function handleLanguageChange(event: Event) {
        const select = event.currentTarget as HTMLSelectElement | null
        if (!select) return
        changeLanguage(select.value)
    }
</script>

<div class="language-switcher">
    <select 
        bind:value={currentLocale} 
        onchange={handleLanguageChange}
        aria-label="Select language"
        class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
        {#each languages as lang}
            <option value={lang.code}>
                {lang.flag} {lang.name}
            </option>
        {/each}
    </select>
</div>

<style>
    .language-switcher {
        display: inline-block;
    }

    select {
        cursor: pointer;
        transition: all 0.2s;
    }

    select:hover {
        border-color: #3b82f6;
    }
</style>
