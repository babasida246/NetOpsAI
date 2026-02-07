/**
 * i18n Configuration for SvelteKit
 */
import { register, init, getLocaleFromNavigator, locale, isLoading } from 'svelte-i18n'

// Register translations
register('en', () => import('./locales/en.json'))
register('vi', () => import('./locales/vi.json'))

const defaultLocale = 'en'
const initialLocale =
    typeof window !== 'undefined' ? getLocaleFromNavigator() || defaultLocale : defaultLocale

init({
    fallbackLocale: defaultLocale,
    initialLocale
})

locale.set(initialLocale)

// Export locale store and loading state for components to use
// Note: In components, use these as $_ and $isLoading (with $ prefix for auto-subscription)
export { locale, _, isLoading } from 'svelte-i18n'
