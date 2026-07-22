import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InputText from '../src/components/InputText.vue'

describe('InputText', () => {
    it('renders with initial value', () => {
        const wrapper = mount(InputText, {
            props: {
                modelValue: 'test value'
            }
        })

        const input = wrapper.find('input')
        expect(input.element.value).toBe('test value')
    })

    it('emits update:modelValue on input', async () => {
        const wrapper = mount(InputText, {
            props: {
                modelValue: ''
            }
        })

        const input = wrapper.find('input')
        await input.setValue('new value')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')![0]).toEqual(['new value'])
    })

    it('renders disabled when disabled prop is true', () => {
        const wrapper = mount(InputText, {
            props: {
                modelValue: '',
                disabled: true
            }
        })

        const input = wrapper.find('input')
        expect(input.attributes('disabled')).toBeDefined()
    })

    it('renders placeholder when provided', () => {
        const wrapper = mount(InputText, {
            props: {
                modelValue: '',
                placeholder: 'Enter text...'
            }
        })

        const input = wrapper.find('input')
        expect(input.attributes('placeholder')).toBe('Enter text...')
    })

    it('has datatable-input class', () => {
        const wrapper = mount(InputText, {
            props: {
                modelValue: ''
            }
        })

        const input = wrapper.find('input')
        expect(input.classes()).toContain('datatable-input')
    })
})
