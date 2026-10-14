/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#b31217', // Bold Red
        'primary-container': '#b31217', // Bold Red for backgrounds
        'primary-fixed': '#fee2e2', // Light red
        'primary-fixed-dim': '#fca5a5',
        secondary: '#4b5563', // Gray 600
        'tertiary-container': '#e5e7eb', // Gray 200
        'surface': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f9fafb',
        'surface-container': '#f3f4f6',
        'surface-container-high': '#e5e7eb',
        'inverse-surface': '#1f2937',
        'on-surface': '#111827',
        'on-surface-variant': '#4b5563',
      },
      spacing: {
        'space-xs': '0.5rem',
        'space-sm': '0.75rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'margin-lg': '2rem',
        'gutter': '1rem',
        'gutter-lg': '2rem',
      },
      fontSize: {
        'label-sm': '0.75rem',
        'label-md': '0.875rem',
        'label-lg': '1rem',
        'body-sm': '0.875rem',
        'body-md': '1rem',
        'body-lg': '1.125rem',
        'headline-sm': '1.25rem',
        'headline-md': '1.5rem',
        'headline-lg': '1.875rem',
        'display-lg': '3rem',
        'tabular-data': '1rem',
      },
      fontWeight: {
        'label-sm': '500',
        'label-md': '500',
        'label-lg': '600',
        'headline-sm': '600',
        'headline-md': '600',
        'headline-lg': '700',
        'display-lg': '700',
      }
    },
  },
  plugins: [],
}
