import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InputDate from '../src/components/InputDate.vue'

describe('InputDate', () => {
    describe('single date mode', () => {
        it('renders date input by default', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: null,
                    type: 'date'
                }
            })

            const input = wrapper.find('input[type="date"]')
            expect(input.exists()).toBe(true)
        })

        it('displays formatted date value', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: '2024-01-15',
                    type: 'date'
                }
            })

            const input = wrapper.find('input[type="date"]')
            expect(input.element.value).toBe('2024-01-15')
        })

        it('emits update:modelValue on input', async () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: null,
                    type: 'date'
                }
            })

            const input = wrapper.find('input[type="date"]')
            await input.setValue('2024-03-20')

            expect(wrapper.emitted('update:modelValue')).toBeTruthy()
            expect(wrapper.emitted('update:modelValue')![0]).toEqual(['2024-03-20'])
        })

        it('renders disabled when disabled prop is true', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: null,
                    type: 'date',
                    disabled: true
                }
            })

            const input = wrapper.find('input')
            expect(input.attributes('disabled')).toBeDefined()
        })
    })

    describe('month mode', () => {
        it('renders month input', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: null,
                    type: 'month'
                }
            })

            const input = wrapper.find('input[type="month"]')
            expect(input.exists()).toBe(true)
        })

        it('displays formatted month value', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: '2024-06-01',
                    type: 'month'
                }
            })

            const input = wrapper.find('input[type="month"]')
            expect(input.element.value).toBe('2024-06')
        })
    })

    describe('date range mode', () => {
        it('renders two date inputs', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: ['', ''],
                    type: 'daterange'
                }
            })

            const inputs = wrapper.findAll('input[type="date"]')
            expect(inputs.length).toBe(2)
        })

        it('displays range values correctly', () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: ['2024-01-01', '2024-01-31'],
                    type: 'daterange'
                }
            })

            const inputs = wrapper.findAll('input[type="date"]')
            expect(inputs[0].element.value).toBe('2024-01-01')
            expect(inputs[1].element.value).toBe('2024-01-31')
        })

        it('emits array on start date change', async () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: ['', '2024-01-31'],
                    type: 'daterange'
                }
            })

            const inputs = wrapper.findAll('input[type="date"]')
            await inputs[0].setValue('2024-01-15')

            expect(wrapper.emitted('update:modelValue')).toBeTruthy()
            expect(wrapper.emitted('update:modelValue')![0]).toEqual([['2024-01-15', '2024-01-31']])
        })

        it('emits array on end date change', async () => {
            const wrapper = mount(InputDate, {
                props: {
                    modelValue: ['2024-01-01', ''],
                    type: 'daterange'
                }
            })

            const inputs = wrapper.findAll('input[type="date"]')
            await inputs[1].setValue('2024-02-15')

            expect(wrapper.emitted('update:modelValue')).toBeTruthy()
            expect(wrapper.emitted('update:modelValue')![0]).toEqual([['2024-01-01', '2024-02-15']])
        })
    })
})
