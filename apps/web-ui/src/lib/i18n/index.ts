/**
 * i18n Configuration for SvelteKit
 */
import { register, init, getLocaleFromNavigator, locale, isLoading } from 'svelte-i18n'

// Register translations
register('en', () => import('./locales/en.json'))
register('vi', () => import('./locales/vi.json'))

// Initialize i18n immediately with await to ensure it completes
init({
    fallbackLocale: 'en',
    initialLocale: getLocaleFromNavigator() || 'en'
})

// Export locale store and loading state for components to use
// Note: In components, use these as $_ and $isLoading (with $ prefix for auto-subscription)
export { locale, _, isLoading } from 'svelte-i18n'
