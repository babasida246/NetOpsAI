import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WorkflowRequestForm from './WorkflowRequestForm.svelte';

describe('WorkflowRequestForm', () => {
  it('renders request type select', () => {
    const { getByText } = render(WorkflowRequestForm);
    expect(getByText('Request Type')).toBeTruthy();
  });
});
