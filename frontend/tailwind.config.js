/** @type {import('tailwindcss').Config} */
export default {
  "content": [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  "theme": {
    "extend": {
      "colors": {
        "primary": "#900b1a",
        "primary-container": "#b2292e",
        "primary-fixed": "#ffdad7",
        "primary-fixed-dim": "#ffb3af",
        "secondary": "#555f71",
        "tertiary-container": "#904d00",
        "surface": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e6eeff",
        "surface-container-high": "#dee9fc",
        "inverse-surface": "#27313f",
        "on-surface": "#121c2a",
        "on-surface-variant": "#59413f",
        "on-primary": "#ffffff",
        "on-primary-container": "#ffcdc9",
        "on-primary-fixed": "#410005",
        "on-primary-fixed-variant": "#900b1a",
        "secondary-container": "#d6e0f6",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#596376",
        "secondary-fixed": "#d9e3f9",
        "secondary-fixed-dim": "#bdc7dc",
        "on-secondary-fixed": "#121c2c",
        "on-secondary-fixed-variant": "#3d4759",
        "tertiary": "#6e3900",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#ffcfab",
        "tertiary-fixed": "#ffdcc3",
        "tertiary-fixed-dim": "#ffb77d",
        "on-tertiary-fixed": "#2f1500",
        "on-tertiary-fixed-variant": "#6e3900",
        "surface-bright": "#f8f9ff",
        "surface-dim": "#d0dbed",
        "surface-variant": "#d9e3f6",
        "surface-container-highest": "#d9e3f6",
        "inverse-on-surface": "#eaf1ff",
        "surface-tint": "#b2292e",
        "outline": "#8d706e",
        "outline-variant": "#e1bebc",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a"
      },
      "spacing": {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "margin-lg": "2rem",
        "gutter": "1rem",
        "gutter-lg": "1.5rem",
        "margin": "1rem",
        "margin-md": "1.5rem"
      },
      "fontSize": {
        "label-sm": "0.75rem",
        "label-md": "0.875rem",
        "label-lg": "1rem",
        "body-sm": "0.875rem",
        "body-md": "1rem",
        "body-lg": "1.125rem",
        "headline-sm": "1.25rem",
        "headline-md": "1.5rem",
        "headline-lg": "1.875rem",
        "display-lg": "3rem",
        "tabular-data": "1rem"
      },
      "fontWeight": {
        "label-sm": "500",
        "label-md": "500",
        "label-lg": "600",
        "headline-sm": "600",
        "headline-md": "600",
        "headline-lg": "700",
        "display-lg": "700"
      },
      "fontFamily": {
        "sans": [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      "boxShadow": {
        "2xs": "0 1px 2px rgb(0 0 0 / .05)",
        "xs": "0 1px 3px rgb(0 0 0 / .07)"
      }
    }
  },
  "plugins": []
};
