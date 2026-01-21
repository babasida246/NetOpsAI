import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AssignModal from './AssignModal.svelte';

describe('AssignModal', () => {
  it('emits assign event', async () => {
    let fired = false;
    const { getByText, getByPlaceholderText } = render(AssignModal, {
      props: {
        open: true,
        assetCode: 'ASSET-1'
      },
      events: {
        assign: () => {
          fired = true;
        }
      }
    });

    await fireEvent.input(getByPlaceholderText('e.g. Nguyen Van A'), { target: { value: 'Alice' } });
    await fireEvent.input(getByPlaceholderText('Employee ID / Dept ID'), { target: { value: 'EMP-1' } });
    await fireEvent.click(getByText('Assign'));

    expect(fired).toBe(true);
  });
});
