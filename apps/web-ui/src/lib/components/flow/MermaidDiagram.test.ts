import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import '@testing-library/jest-dom'
import MermaidDiagram from '$lib/components/flow/MermaidDiagram.svelte'

/**
 * Comprehensive Tests for MermaidDiagram Component
 */
describe('MermaidDiagram Component', () => {
    // Mock mermaid library
    const mockRender = vi.fn()
    const mockInitialize = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock mermaid module
        vi.doMock('mermaid', () => ({
            default: {
                initialize: mockInitialize,
                render: mockRender
            }
        }))
    })

    describe('Basic Functionality', () => {
        it('should render loading state initially', async () => {
            mockRender.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({ svg: '<svg>test</svg>' }), 100))
            )

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            // Should show loading spinner
            const loadingSpinner = screen.getByRole('img', { name: /loading/i })
            expect(loadingSpinner).toBeInTheDocument()
        })

        it('should render diagram successfully', async () => {
            mockRender.mockResolvedValue({ svg: '<svg id="mermaid-test"><g>Test Diagram</g></svg>' })

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B',
                    class: 'test-diagram'
                }
            })

            await waitFor(() => {
                const diagramContainer = document.querySelector('.mermaid-container')
                expect(diagramContainer).toBeInTheDocument()
            })

            expect(mockInitialize).toHaveBeenCalledWith(expect.objectContaining({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose'
            }))

            expect(mockRender).toHaveBeenCalledWith(
                expect.stringMatching(/mermaid-\d+-\w+/),
                'graph TD\n    A --> B'
            )
        })

        it('should handle custom config', async () => {
            mockRender.mockResolvedValue({ svg: '<svg>test</svg>' })

            const customConfig = {
                theme: 'dark',
                fontFamily: 'Arial',
                fontSize: 14
            }

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B',
                    config: customConfig
                }
            })

            expect(mockInitialize).toHaveBeenCalledWith({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                ...customConfig
            })
        })

        it('should handle empty diagram gracefully', async () => {
            render(MermaidDiagram, {
                props: {
                    diagram: ''
                }
            })

            expect(mockRender).not.toHaveBeenCalled()
        })
    })

    describe('Error Handling', () => {
        it('should display error message when rendering fails', async () => {
            mockRender.mockRejectedValue(new Error('Invalid syntax'))

            render(MermaidDiagram, {
                props: {
                    diagram: 'invalid mermaid syntax'
                }
            })

            await waitFor(() => {
                expect(screen.getByText('Diagram Error')).toBeInTheDocument()
                expect(screen.getByText('Invalid syntax')).toBeInTheDocument()
            })
        })

        it('should display generic error for unknown errors', async () => {
            mockRender.mockRejectedValue('Unknown error')

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            await waitFor(() => {
                expect(screen.getByText('Failed to render diagram')).toBeInTheDocument()
            })
        })

        it('should log errors to console', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            mockRender.mockRejectedValue(new Error('Test error'))

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Mermaid rendering error:', expect.any(Error))
            })

            consoleSpy.mockRestore()
        })
    })

    describe('Reactivity', () => {
        it('should re-render when diagram changes', async () => {
            mockRender.mockResolvedValue({ svg: '<svg>test</svg>' })

            const { component } = render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            await waitFor(() => {
                expect(mockRender).toHaveBeenCalledTimes(1)
            })

            // Change the diagram
            component.$set({ diagram: 'graph TD\n    C --> D' })

            await waitFor(() => {
                expect(mockRender).toHaveBeenCalledTimes(2)
                expect(mockRender).toHaveBeenLastCalledWith(
                    expect.stringMatching(/mermaid-\d+-\w+/),
                    'graph TD\n    C --> D'
                )
            })
        })

        it('should not re-render with same diagram', async () => {
            mockRender.mockResolvedValue({ svg: '<svg>test</svg>' })

            const { component } = render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            await waitFor(() => {
                expect(mockRender).toHaveBeenCalledTimes(1)
            })

            // Set the same diagram
            component.$set({ diagram: 'graph TD\n    A --> B' })

            // Should not trigger re-render
            await new Promise(resolve => setTimeout(resolve, 100))
            expect(mockRender).toHaveBeenCalledTimes(1)
        })
    })

    describe('Complex Diagrams', () => {
        it('should handle flowchart diagrams', async () => {
            mockRender.mockResolvedValue({ svg: '<svg>flowchart</svg>' })

            const flowchartDiagram = `
                flowchart TD
                    A[Start] --> B{Decision}
                    B -->|Yes| C[Process 1]
                    B -->|No| D[Process 2]
                    C --> E[End]
                    D --> E
            `

            render(MermaidDiagram, {
                props: { diagram: flowchartDiagram }
            })

            await waitFor(() => {
                expect(mockRender).toHaveBeenCalledWith(
                    expect.any(String),
                    flowchartDiagram
                )
            })
        })

        it('should handle sequence diagrams', async () => {
            mockRender.mockResolvedValue({ svg: '<svg>sequence</svg>' })

            const sequenceDiagram = `
                sequenceDiagram
                    participant A as User
                    participant B as API
                    participant C as Database
                    A->>B: Request
                    B->>C: Query
                    C-->>B: Result
                    B-->>A: Response
            `

            render(MermaidDiagram, {
                props: { diagram: sequenceDiagram }
            })

            await waitFor(() => {
                expect(mockRender).toHaveBeenCalledWith(
                    expect.any(String),
                    sequenceDiagram
                )
            })
        })

        it('should handle gantt charts', async () => {
            mockRender.mockResolvedValue({ svg: '<svg>gantt</svg>' })

            const ganttDiagram = `
                gantt
                    title Project Schedule
                    dateFormat YYYY-MM-DD
                    section Development
                    Design       :active, des1, 2024-01-01, 5d
                    Development  :dev1, after des1, 10d
                    Testing      :test1, after dev1, 5d
            `

            render(MermaidDiagram, {
                props: { diagram: ganttDiagram }
            })

            await waitFor(() => {
                expect(mockRender).toHaveBeenCalledWith(
                    expect.any(String),
                    ganttDiagram
                )
            })
        })
    })

    describe('Styling and Classes', () => {
        it('should apply custom CSS classes', () => {
            mockRender.mockResolvedValue({ svg: '<svg>test</svg>' })

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B',
                    class: 'custom-diagram large-size'
                }
            })

            const container = document.querySelector('.custom-diagram.large-size')
            expect(container).toBeInTheDocument()
        })

        it('should have default styling', () => {
            mockRender.mockResolvedValue({ svg: '<svg>test</svg>' })

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            const container = document.querySelector('.w-full.h-96')
            expect(container).toBeInTheDocument()
        })
    })

    describe('SVG Output Handling', () => {
        it('should handle SVG with proper styling', async () => {
            const mockSvg = `
                <svg width="200" height="100">
                    <g>
                        <rect x="10" y="10" width="50" height="30" fill="blue"/>
                        <text x="35" y="30" text-anchor="middle">A</text>
                    </g>
                </svg>
            `
            mockRender.mockResolvedValue({ svg: mockSvg })

            render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A[Node A]'
                }
            })

            await waitFor(() => {
                const container = document.querySelector('.mermaid-container')
                expect(container?.innerHTML).toContain('<svg')
                expect(container?.innerHTML).toContain('rect')
                expect(container?.innerHTML).toContain('text')
            })
        })

        it('should clear previous content before rendering new diagram', async () => {
            let renderCount = 0
            mockRender.mockImplementation(async () => {
                renderCount++
                return { svg: `<svg>Diagram ${renderCount}</svg>` }
            })

            const { component } = render(MermaidDiagram, {
                props: {
                    diagram: 'graph TD\n    A --> B'
                }
            })

            await waitFor(() => {
                expect(renderCount).toBe(1)
            })

            component.$set({ diagram: 'graph TD\n    C --> D' })

            await waitFor(() => {
                expect(renderCount).toBe(2)
                const container = document.querySelector('.mermaid-container')
                expect(container?.innerHTML).toContain('Diagram 2')
                expect(container?.innerHTML).not.toContain('Diagram 1')
            })
        })
    })
})