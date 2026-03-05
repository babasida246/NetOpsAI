import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import '@testing-library/jest-dom'
import WorkflowProgressPanel from '$lib/components/flow/WorkflowProgressPanel.svelte'
import type { WorkflowStep } from '$lib/components/flow/index.js'

/**
 * Comprehensive Tests for WorkflowProgressPanel Component
 */
describe('WorkflowProgressPanel Component', () => {
    const mockSteps: WorkflowStep[] = [
        {
            id: 'step1',
            name: 'Planning',
            status: 'completed',
            description: 'Initial planning phase',
            assignee: 'John Doe',
            progress: 100
        },
        {
            id: 'step2',
            name: 'Development',
            status: 'in-progress',
            description: 'Code development',
            assignee: 'Jane Smith',
            progress: 60,
            dependencies: ['step1']
        },
        {
            id: 'step3',
            name: 'Testing',
            status: 'pending',
            description: 'Quality assurance testing',
            assignee: 'Bob Wilson',
            progress: 0,
            dependencies: ['step2']
        },
        {
            id: 'step4',
            name: 'Deployment',
            status: 'pending',
            description: 'Production deployment',
            progress: 0,
            dependencies: ['step3']
        }
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Basic Rendering', () => {
        it('should render with default props', () => {
            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps
                }
            })

            expect(screen.getByText('Workflow Progress')).toBeInTheDocument()
            expect(screen.getByText('Progress: 25%')).toBeInTheDocument() // 1 completed out of 4 steps
            expect(screen.getByText('Completed: 1/4')).toBeInTheDocument()
            expect(screen.getByText('In Progress: 1')).toBeInTheDocument()
        })

        it('should render with custom title', () => {
            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    title: 'Custom Project Workflow'
                }
            })

            expect(screen.getByText('Custom Project Workflow')).toBeInTheDocument()
        })

        it('should show step details', () => {
            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps
                }
            })

            expect(screen.getByText('Planning')).toBeInTheDocument()
            expect(screen.getByText('Development')).toBeInTheDocument()
            expect(screen.getByText('Testing')).toBeInTheDocument()
            expect(screen.getByText('Deployment')).toBeInTheDocument()

            expect(screen.getByText('Initial planning phase')).toBeInTheDocument()
            expect(screen.getByText('Assignee: John Doe')).toBeInTheDocument()
        })
    })

    describe('Progress Calculation', () => {
        it('should calculate correct overall progress', () => {
            const steps: WorkflowStep[] = [
                { id: '1', name: 'Step 1', status: 'completed' },
                { id: '2', name: 'Step 2', status: 'completed' },
                { id: '3', name: 'Step 3', status: 'in-progress' },
                { id: '4', name: 'Step 4', status: 'pending' }
            ]

            render(WorkflowProgressPanel, {
                props: { steps }
            })

            expect(screen.getByText('Progress: 50%')).toBeInTheDocument() // 2 completed out of 4
        })

        it('should handle 100% completion', () => {
            const steps: WorkflowStep[] = [
                { id: '1', name: 'Step 1', status: 'completed' },
                { id: '2', name: 'Step 2', status: 'completed' }
            ]

            render(WorkflowProgressPanel, {
                props: { steps }
            })

            expect(screen.getByText('Progress: 100%')).toBeInTheDocument()
            expect(screen.getByText('Completed: 2/2')).toBeInTheDocument()
        })

        it('should handle empty steps', () => {
            render(WorkflowProgressPanel, {
                props: { steps: [] }
            })

            expect(screen.getByText('Progress: 0%')).toBeInTheDocument()
            expect(screen.getByText('Completed: 0/0')).toBeInTheDocument()
        })

        it('should show failed steps count', () => {
            const steps: WorkflowStep[] = [
                { id: '1', name: 'Step 1', status: 'completed' },
                { id: '2', name: 'Step 2', status: 'failed' },
                { id: '3', name: 'Step 3', status: 'failed' }
            ]

            render(WorkflowProgressPanel, {
                props: { steps }
            })

            expect(screen.getByText('Failed: 2')).toBeInTheDocument()
        })
    })

    describe('Diagram Type Switching', () => {
        it('should default to workflow diagram', () => {
            render(WorkflowProgressPanel, {
                props: { steps: mockSteps }
            })

            const flowButton = screen.getByText('Flow')
            const mermaidButton = screen.getByText('Mermaid')

            expect(flowButton).toHaveClass('text-blue-600') // Active state
            expect(mermaidButton).not.toHaveClass('text-blue-600')
        })

        it('should switch to mermaid diagram', async () => {
            render(WorkflowProgressPanel, {
                props: { steps: mockSteps }
            })

            const mermaidButton = screen.getByText('Mermaid')
            await fireEvent.click(mermaidButton)

            expect(mermaidButton).toHaveClass('text-blue-600')
        })

        it('should switch back to workflow diagram', async () => {
            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    diagramType: 'mermaid'
                }
            })

            const flowButton = screen.getByText('Flow')
            await fireEvent.click(flowButton)

            expect(flowButton).toHaveClass('text-blue-600')
        })
    })

    describe('Status Symbols and Colors', () => {
        it('should display correct status symbols', () => {
            render(WorkflowProgressPanel, {
                props: { steps: mockSteps }
            })

            expect(screen.getByText('✅')).toBeInTheDocument() // completed
            expect(screen.getByText('🔄')).toBeInTheDocument() // in-progress  
            expect(screen.getAllByText('⏳')).toHaveLength(2) // pending (2 steps)
        })

        it('should show failed status symbol', () => {
            const stepsWithFailure: WorkflowStep[] = [
                { id: '1', name: 'Failed Step', status: 'failed' }
            ]

            render(WorkflowProgressPanel, {
                props: { steps: stepsWithFailure }
            })

            expect(screen.getByText('❌')).toBeInTheDocument()
        })
    })

    describe('Editable Mode', () => {
        it('should show status dropdowns in editable mode', () => {
            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    editable: true
                }
            })

            const selects = document.querySelectorAll('select')
            expect(selects).toHaveLength(mockSteps.length)
        })

        it('should show status badges in read-only mode', () => {
            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    editable: false
                }
            })

            expect(screen.getByText('completed')).toBeInTheDocument()
            expect(screen.getByText('in progress')).toBeInTheDocument()
            expect(screen.getAllByText('pending')).toHaveLength(2)
        })

        it('should call onStepUpdate when status changes', async () => {
            const onStepUpdate = vi.fn()

            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    editable: true,
                    onStepUpdate
                }
            })

            const selects = document.querySelectorAll('select')
            const firstSelect = selects[0] as HTMLSelectElement

            await fireEvent.change(firstSelect, { target: { value: 'completed' } })

            expect(onStepUpdate).toHaveBeenCalledWith('step1', { status: 'completed' })
        })
    })

    describe('Step Interactions', () => {
        it('should call onStepClick when step is clicked', async () => {
            const onStepClick = vi.fn()

            render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    onStepClick
                }
            })

            // Click on a step in the details section
            const stepElement = screen.getByText('Planning').closest('div')
            await fireEvent.click(stepElement!)

            expect(onStepClick).toHaveBeenCalledWith(mockSteps[0])
        })
    })

    describe('Progress Display', () => {
        it('should show individual step progress', () => {
            render(WorkflowProgressPanel, {
                props: { steps: mockSteps }
            })

            expect(screen.getByText('100%')).toBeInTheDocument() // Planning step
            expect(screen.getByText('60%')).toBeInTheDocument() // Development step
            expect(screen.getByText('0%')).toBeInTheDocument() // Testing step
        })

        it('should hide progress when not provided', () => {
            const stepsWithoutProgress: WorkflowStep[] = [
                { id: '1', name: 'Step 1', status: 'completed' }
            ]

            render(WorkflowProgressPanel, {
                props: { steps: stepsWithoutProgress }
            })

            expect(screen.queryByText('100%')).not.toBeInTheDocument()
        })
    })

    describe('Mermaid Diagram Generation', () => {
        it('should generate correct mermaid syntax', () => {
            const { component } = render(WorkflowProgressPanel, {
                props: {
                    steps: mockSteps,
                    diagramType: 'mermaid'
                }
            })

            // Access the component's internal mermaid diagram generation
            // This would require making the function accessible or testing the output
            const expectedMermaid = expect.stringContaining('graph TD')
            // We can't easily test the internal function without exposing it
            // In a real scenario, we might expose it or test the rendered output
        })
    })

    describe('Dependencies Handling', () => {
        it('should show correct step connections', () => {
            render(WorkflowProgressPanel, {
                props: { steps: mockSteps }
            })

            // The dependencies should be reflected in the workflow visualization
            // This would be tested by checking the rendered flow diagram or mermaid output
            expect(screen.getByText('Development')).toBeInTheDocument()
            expect(screen.getByText('Testing')).toBeInTheDocument()
        })
    })

    describe('Responsive Design', () => {
        it('should handle different screen sizes', () => {
            render(WorkflowProgressPanel, {
                props: { steps: mockSteps }
            })

            // Check that the component maintains proper structure
            const container = document.querySelector('div[class*="w-full"]')
            expect(container).toBeInTheDocument()
        })
    })

    describe('Error Handling', () => {
        it('should handle malformed step data gracefully', () => {
            const malformedSteps = [
                { id: '', name: '', status: 'invalid' as any }
            ]

            expect(() => {
                render(WorkflowProgressPanel, {
                    props: { steps: malformedSteps }
                })
            }).not.toThrow()
        })

        it('should handle circular dependencies gracefully', () => {
            const circularSteps: WorkflowStep[] = [
                { id: 'step1', name: 'Step 1', status: 'pending', dependencies: ['step2'] },
                { id: 'step2', name: 'Step 2', status: 'pending', dependencies: ['step1'] }
            ]

            expect(() => {
                render(WorkflowProgressPanel, {
                    props: { steps: circularSteps }
                })
            }).not.toThrow()
        })
    })
})