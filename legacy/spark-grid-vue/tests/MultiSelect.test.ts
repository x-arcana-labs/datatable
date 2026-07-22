import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MultiSelect from '../src/components/MultiSelect.vue'

describe('MultiSelect', () => {
    const defaultOptions = [
        { value: 1, label: 'Option 1' },
        { value: 2, label: 'Option 2' },
        { value: 3, label: 'Option 3' },
    ]

    it('renders with placeholder when no items selected', () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [],
                options: defaultOptions,
                placeholder: 'Select items...'
            }
        })

        expect(wrapper.text()).toContain('Select items...')
    })

    it('displays selected items as tags', () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [1, 2],
                options: defaultOptions,
            }
        })

        // Check that selected items appear as tags (in the trigger area)
        const tags = wrapper.findAll('.multi-select-tag')
        expect(tags.length).toBe(2)
        expect(tags[0].text()).toContain('Option 1')
        expect(tags[1].text()).toContain('Option 2')
    })

    it('opens dropdown on click', async () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [],
                options: defaultOptions,
            }
        })

        const trigger = wrapper.find('.multi-select-trigger')
        await trigger.trigger('click')

        expect(wrapper.find('.multi-select-dropdown').isVisible()).toBe(true)
    })

    it('emits update:modelValue when option is selected', async () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [],
                options: defaultOptions,
            }
        })

        // Open dropdown
        await wrapper.find('.multi-select-trigger').trigger('click')

        // Click first option
        const options = wrapper.findAll('.multi-select-option')
        await options[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')![0]).toEqual([[1]])
    })

    it('emits update:modelValue when option is deselected', async () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [1, 2],
                options: defaultOptions,
            }
        })

        // Open dropdown
        await wrapper.find('.multi-select-trigger').trigger('click')

        // Click first option to deselect
        const options = wrapper.findAll('.multi-select-option')
        await options[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')![0]).toEqual([[2]])
    })

    it('clears all selections when clear button is clicked', async () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [1, 2],
                options: defaultOptions,
                clearable: true
            }
        })

        const clearButton = wrapper.find('.multi-select-clear')
        await clearButton.trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')![0]).toEqual([[]])
    })

    it('removes individual tag when remove button is clicked', async () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [1, 2],
                options: defaultOptions,
            }
        })

        const removeButtons = wrapper.findAll('.multi-select-tag-remove')
        await removeButtons[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')![0]).toEqual([[2]])
    })

    it('does not open dropdown when disabled', async () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [],
                options: defaultOptions,
                disabled: true
            }
        })

        // Dropdown should be hidden initially
        expect(wrapper.find('.multi-select-dropdown').attributes('style')).toContain('display: none')

        await wrapper.find('.multi-select-trigger').trigger('click')

        // Should still be hidden after click when disabled
        expect(wrapper.find('.multi-select-dropdown').attributes('style')).toContain('display: none')
    })

    it('shows empty message when no options available', () => {
        const wrapper = mount(MultiSelect, {
            props: {
                modelValue: [],
                options: [],
            }
        })

        expect(wrapper.text()).toContain('Nenhuma opção disponível')
    })
})
