
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Soft low-saturation card backgrounds
        roseSoft: { DEFAULT: '#fff1f2' },
        amberSoft: { DEFAULT: '#fff7ed' },
        emeraldSoft: { DEFAULT: '#ecfdf5' },
        skySoft: { DEFAULT: '#f0f9ff' },
        violetSoft: { DEFAULT: '#f5f3ff' },
        fuchsiaSoft: { DEFAULT: '#fdf4ff' },
        // GitHub-like dark surface
        gh: {
          bg: '#0d1117',
          soft: '#161b22',
          border: '#30363d',
          text: '#c9d1d9'
        }
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)'
      },
      borderRadius: {
        '2xl': '1rem'
      }
    }
  },
  plugins: [],
}
