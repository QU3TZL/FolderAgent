/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
            typography: {
                DEFAULT: {
                    css: {
                        maxWidth: 'none',
                        color: 'inherit',
                        a: {
                            color: 'inherit',
                            textDecoration: 'none',
                            fontWeight: '500',
                        },
                        '[class~="lead"]': {
                            color: 'inherit',
                        },
                        strong: {
                            color: 'inherit',
                        },
                        'ol[type="A"]': {
                            listStyleType: 'upper-alpha',
                        },
                        'ol[type="a"]': {
                            listStyleType: 'lower-alpha',
                        },
                        'ol[type="A" s]': {
                            listStyleType: 'upper-alpha',
                        },
                        'ol[type="a" s]': {
                            listStyleType: 'lower-alpha',
                        },
                        'ol[type="I"]': {
                            listStyleType: 'upper-roman',
                        },
                        'ol[type="i"]': {
                            listStyleType: 'lower-roman',
                        },
                        'ol[type="I" s]': {
                            listStyleType: 'upper-roman',
                        },
                        'ol[type="i" s]': {
                            listStyleType: 'lower-roman',
                        },
                        'ol[type="1"]': {
                            listStyleType: 'decimal',
                        },
                        'ol > li': {
                            paddingLeft: '0.375em',
                        },
                        'ul > li': {
                            paddingLeft: '0.375em',
                        },
                        hr: {
                            borderColor: 'inherit',
                            opacity: 0.1,
                        },
                        blockquote: {
                            fontWeight: '500',
                            fontStyle: 'italic',
                            color: 'inherit',
                            borderLeftWidth: '0.25rem',
                            borderLeftColor: 'inherit',
                            quotes: '"\\201C""\\201D""\\2018""\\2019"',
                            marginTop: '1.6em',
                            marginBottom: '1.6em',
                            paddingLeft: '1em',
                        },
                        h1: {
                            color: 'inherit',
                        },
                        h2: {
                            color: 'inherit',
                        },
                        h3: {
                            color: 'inherit',
                        },
                        h4: {
                            color: 'inherit',
                        },
                        'figure figcaption': {
                            color: 'inherit',
                        },
                        code: {
                            color: 'inherit',
                        },
                        'a code': {
                            color: 'inherit',
                        },
                        pre: {
                            color: 'inherit',
                            backgroundColor: 'transparent',
                        },
                        thead: {
                            color: 'inherit',
                            borderBottomColor: 'inherit',
                        },
                        'tbody tr': {
                            borderBottomColor: 'inherit',
                        },
                    },
                },
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
        require('@tailwindcss/typography'),
    ],
} 