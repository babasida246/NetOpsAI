import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import InventoryScanPanel from './InventoryScanPanel.svelte';

describe('InventoryScanPanel', () => {
  it('renders scan button', () => {
    const { getByText } = render(InventoryScanPanel, { props: { sessionId: 's1' } });
    expect(getByText('Scan')).toBeTruthy();
  });
});
