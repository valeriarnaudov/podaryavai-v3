/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#F8FAFC',
                textMain: '#1E293B',
                accent: '#0F172A', // Midnight Blue example
                secondary: '#E2E8F0',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 8px 30px rgb(0 0 0 / 0.04)',
                'floating': '0 20px 40px rgb(0 0 0 / 0.08)',
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            }
        },
    },
    plugins: [],
}
