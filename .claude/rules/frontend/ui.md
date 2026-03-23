---
paths:
  - "src/components/**/*.tsx"
---

# UI Rules (Radix + TailwindCSS)

## Radix Primitives

- Always accessible by default
- Keyboard navigation built-in
- Use composition pattern

## TailwindCSS v4

- Utility-first, no inline styles
- Use CSS variables for theming
- Responsive: mobile-first (`md:`, `lg:`)

```tsx
<div className="flex flex-col gap-4 p-4 md:flex-row md:p-6">
  <h1 className="text-2xl font-bold text-foreground">
    Title
  </h1>
</div>
```

## Theme Awareness (REQUIRED)

Every UI element MUST use theme-aware CSS variable classes. Never use hardcoded colors.

- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`
- Backgrounds: `bg-background`, `bg-muted`, `bg-card`, `bg-accent`
- Borders: `border-border`, `border-input`
- Never use `text-gray-*`, `text-white`, `text-black`, `bg-white`, `bg-gray-*` directly
- Every `<pre>`, `<code>`, `<span>`, `<p>`, `<h1>`-`<h6>` must have explicit `text-foreground` or `text-muted-foreground` if not inside a themed parent

```tsx
// Good - theme-aware
<div className="bg-background text-foreground">
  <p className="text-muted-foreground">Content</p>
</div>

// Bad - hardcoded colors
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>
```

## Component Variants

Use class variance authority (cva):

```tsx
import { cva } from 'class-variance-authority'

const button = cva('px-4 py-2 rounded font-medium', {
  variants: {
    intent: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    },
    size: {
      sm: 'text-sm px-3 py-1',
      md: 'text-base px-4 py-2',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'md',
  },
})
```

## Spacing & Layout

- Use consistent spacing scale (4, 8, 12, 16, 24, 32, 48)
- Flexbox for 1D, Grid for 2D
- Gap over margin for consistent spacing

```tsx
// Good - gap
<div className="flex gap-4">

// Avoid - individual margins
<div className="flex">
  <div className="mr-4">
```

## Accessibility

- Always include ARIA labels where needed
- Maintain focus states
- Ensure color contrast
- Test keyboard navigation
