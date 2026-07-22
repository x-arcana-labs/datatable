import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTableFooter from '../src/components/DataTableFooter.vue'

// Mock grid object - using 'as any' to bypass strict type checking for tests
const createMockGrid = (overrides = {}) => ({
    currentPage: 1,
    rowsPerPage: 10,
    totalRows: 100,
    config: {
        checkboxEnabled: false,
        isRowsPerPageVisible: true,
    },
    paginate: vi.fn(),
    getCheckedRows: () => [],
    // Add minimal required properties
    uuid: 'test-uuid',
    loading: false,
    filters: {},
    rows: [],
    ...overrides
}) as any

describe('DataTableFooter', () => {
    it('renders pagination info correctly', () => {
        const grid = createMockGrid()
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        expect(wrapper.text()).toContain('Exibindo 1 a 10 de 100 registro(s)')
    })

    it('displays correct range for middle page', () => {
        const grid = createMockGrid({ currentPage: 3, rowsPerPage: 25 })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        expect(wrapper.text()).toContain('Exibindo 51 a 75 de 100 registro(s)')
    })

    it('displays correct ending row when on last page', () => {
        const grid = createMockGrid({
            currentPage: 4,
            rowsPerPage: 30,
            totalRows: 100
        })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        // Should show 100 not 120
        expect(wrapper.text()).toContain('Exibindo 91 a 100 de 100 registro(s)')
    })

    it('calls paginate when next button is clicked', async () => {
        const grid = createMockGrid()
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        const buttons = wrapper.findAll('button')
        const nextButton = buttons[buttons.length - 1]
        await nextButton.trigger('click')

        expect(grid.paginate).toHaveBeenCalledWith(2, 10)
    })

    it('calls paginate when previous button is clicked', async () => {
        const grid = createMockGrid({ currentPage: 3 })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        const prevButton = wrapper.findAll('button')[0]
        await prevButton.trigger('click')

        expect(grid.paginate).toHaveBeenCalledWith(2, 10)
    })

    it('disables previous button on first page', () => {
        const grid = createMockGrid({ currentPage: 1 })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        const prevButton = wrapper.findAll('button')[0]
        expect(prevButton.attributes('disabled')).toBeDefined()
    })

    it('disables next button on last page', () => {
        const grid = createMockGrid({ currentPage: 10, rowsPerPage: 10, totalRows: 100 })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        const buttons = wrapper.findAll('button')
        const nextButton = buttons[buttons.length - 1]
        expect(nextButton.attributes('disabled')).toBeDefined()
    })

    it('calls paginate with new rows per page when select changes', async () => {
        const grid = createMockGrid()
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        const select = wrapper.find('select')
        await select.setValue('25')

        expect(grid.paginate).toHaveBeenCalledWith(1, 25)
    })

    it('hides rows per page selector when isRowsPerPageVisible is false', () => {
        const grid = createMockGrid({
            config: { isRowsPerPageVisible: false, checkboxEnabled: false }
        })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        const pageDetails = wrapper.find('.arcana-datatable__page-details')
        // v-show sets display: none
        expect(pageDetails.attributes('style')).toContain('display: none')
    })

    it('shows selected rows count when checkboxEnabled and rows are checked', () => {
        const grid = createMockGrid({
            config: { checkboxEnabled: true, isRowsPerPageVisible: true },
            getCheckedRows: () => [{ id: 1 }, { id: 2 }]
        })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        expect(wrapper.text()).toContain('2 registro(s) selecionado(s)')
    })

    it('renders correct number of page buttons', () => {
        const grid = createMockGrid({ currentPage: 5, totalRows: 200, rowsPerPage: 10 })
        const wrapper = mount(DataTableFooter, {
            props: { grid }
        })

        // Should show pages around current page (5)
        const pageButtons = wrapper.findAll('li')
        // Minus 2 for prev/next buttons
        expect(pageButtons.length).toBeGreaterThan(2)
    })
})
