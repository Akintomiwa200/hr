# Smart HR — Design System

## Brand Identity

**Name:** Smart HR  
**Tagline:** Modern workforce management for every team  
**Personality:** Professional, trustworthy, efficient. Clean enterprise SaaS with human warmth.

---

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `indigo-600` | `#4F46E5` | Primary buttons, links, active nav, focus rings |
| `indigo-700` | `#4338CA` | Primary hover states |
| `indigo-50` | `#EEF2FF` | Subtle highlights, icon backgrounds |
| `indigo-100` | `#E0E7FF` | Badges, selected row backgrounds |

### Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| `gray-900` | `#111827` | Headings, primary text |
| `gray-700` | `#374151` | Body text, labels |
| `gray-500` | `#6B7280` | Muted text, placeholders |
| `gray-400` | `#9CA3AF` | Disabled text, icons |
| `gray-200` | `#E5E7EB` | Borders, dividers |
| `gray-100` | `#F3F4F6` | Hover backgrounds, table stripes |
| `gray-50` | `#F9FAFB` | Page background |
| `white` | `#FFFFFF` | Cards, sidebar, modals |

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Success | `#059669` | Approved, active, present |
| Success bg | `#ECFDF5` | Success badges |
| Warning | `#D97706` | Pending, on leave |
| Warning bg | `#FFFBEB` | Warning badges |
| Error | `#DC2626` | Rejected, absent, errors |
| Error bg | `#FEF2F2` | Error badges |
| Info | `#2563EB` | Informational states |
| Info bg | `#EFF6FF` | Info badges |

---

## Typography

- **Font:** Inter (via `next/font/google`)
- **Page title:** `text-2xl font-bold text-gray-900`
- **Section title:** `text-lg font-semibold text-gray-900`
- **Card title:** `text-sm font-semibold text-gray-900`
- **Body:** `text-sm text-gray-700`
- **Muted:** `text-xs text-gray-500`
- **Eyebrow:** `text-xs font-semibold uppercase tracking-widest text-indigo-600`

---

## Layout

### Dashboard Shell

- **Sidebar:** Fixed left, `w-64`, white bg, `border-r border-gray-200`
- **Main:** `ml-64 min-h-screen bg-gray-50`
- **Top bar:** Sticky, white, `border-b border-gray-200`, `h-16`, `px-6`
- **Content area:** `p-6 max-w-7xl`

### Spacing Scale

`4px` / `8px` / `12px` / `16px` / `24px` / `32px` / `48px`

### Border Radius

- Buttons & inputs: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Avatars: `rounded-full`
- Badges: `rounded-full`

---

## Components

### Primary Button

```tsx
className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
```

### Secondary Button

```tsx
className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
```

### Card

```tsx
className="bg-white rounded-xl border border-gray-200 shadow-sm"
```

### Stat Card

```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
      <Icon className="w-5 h-5 text-indigo-600" />
    </div>
  </div>
</div>
```

### Input

```tsx
className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
```

### Badge

- Success: `bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-0.5 rounded-full`
- Warning: `bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full`
- Error: `bg-red-50 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full`
- Info: `bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full`
- Neutral: `bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full`

### Data Table

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-gray-200 bg-gray-50">
      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">...</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    <tr className="hover:bg-gray-50 transition-colors">...</tr>
  </tbody>
</table>
```

### Sidebar Nav Item

- Default: `flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors`
- Active: `flex items-center gap-3 px-3 py-2.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg font-medium`

---

## Design Principles

1. **Light mode first** — Clean white surfaces on gray-50 backgrounds
2. **Borders over shadows** — Subtle `border-gray-200`, minimal shadow-sm on cards
3. **Information density** — Dashboard-appropriate, not marketing-sparse
4. **Role-aware UI** — HR admins see full controls; employees see self-service views
5. **Consistent status language** — Color-coded badges for all workflow states

## Do's and Don'ts

**Do:**
- Use indigo-600 for all primary actions
- Keep sidebar navigation consistent across all dashboard pages
- Show empty states with icon + message + CTA
- Use lucide-react icons at 16–20px

**Don't:**
- Use gradient hero banners inside the dashboard
- Mix multiple accent colors beyond indigo semantic palette
- Use box shadows heavier than shadow-sm
- Show admin-only actions to employee role users
