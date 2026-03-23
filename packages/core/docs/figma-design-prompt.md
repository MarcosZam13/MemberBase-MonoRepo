# MemberBase — Figma AI Design Prompt

Use the following prompt to generate a complete UI design system and screens in Figma AI / Figma Make.

---

## Prompt

Design a complete **white-label SaaS membership platform** called **MemberBase**.
This platform is used by small businesses (gyms, studios, clubs) to manage members, subscriptions, payments, and exclusive digital content.

### Brand & Style

- **Color palette**: Deep navy primary (`#1E3A5F`), electric blue hover (`#2563EB`), orange accent (`#F97316`)
- **Background**: Pure white `#FFFFFF`, surface light gray `#F9FAFB`
- **Text**: Near-black `#111827`, muted `#6B7280`
- **Borders**: Light `#E5E7EB`, inputs `#E5E7EB`
- **Semantic**: Success `#16A34A`, Warning `#D97706`, Danger `#DC2626`
- **Typography**: Inter font, headings bold/semibold, body regular
- **Border radius**: Buttons `8px`, cards `12px`, inputs `6px`
- **Shadows**: Subtle card shadows (0 1px 3px rgba(0,0,0,0.1))
- **Style**: Clean, professional, minimal — inspired by Stripe Dashboard and Linear

---

### Screens to Design

#### A. Authentication

1. **Login page** — centered card, brand logo top, email + password fields, "Iniciar sesión" CTA button, "¿Olvidaste tu contraseña?" link below. Background: light gray with subtle pattern.
2. **Register page** — same layout as login, adds full name field and password confirmation.

---

#### B. Member Portal (`/portal`)

Top navigation bar with:
- Left: brand logo/name in white on navy background
- Center: nav links — Inicio, Planes, Mi Membresía, Contenido, Comunidad
- Right: user name text + "Salir" ghost button

3. **Portal Dashboard** — Two-column layout on desktop:
   - Left column (2/3): Membership status card with colored badge (Active/Pending/Expired), plan name, days remaining progress bar, expiry date. Below: "Contenido reciente" — 2x2 card grid with content titles.
   - Right column (1/3): Quick actions panel — buttons to go to Plans, Upload Payment Proof, View Community.

4. **Plans page** — Grid of 2-3 plan cards. Each card: plan name bold, price large + currency, duration text, bullet list of features (checkmarks), CTA button "Seleccionar plan". Active plan has a highlighted border.

5. **Membership / Payment Upload page** — Current subscription status at top. Below: upload area (dashed border, upload icon, "Arrastra tu comprobante aquí o haz clic para seleccionar"). Payment method field, notes textarea, submit button. Shows uploaded file preview if already uploaded.

6. **Content page** — Filter bar with pill buttons for categories (All, Rutinas, Nutrición, etc.) colored with category colors. Below: 3-column card grid. Each card: type icon badge (Article/Video/Image), category badge with color, title bold, description truncated 2 lines.

7. **Content detail page** — Back button top left. Title large, type badge. For video: full-width 16:9 iframe embed. For article: formatted text body with prose styles. For file: download card with icon.

8. **Community page** — List of posts. Each row: pin icon if pinned, post title bold, author + relative date, comment count with chat icon. "Nuevo post" button top right.

9. **New post page** — Simple form: title input, large body textarea, Publish / Cancel buttons.

10. **Post detail page** — Post title + author + date. Full body text. Separator. Comments list (avatar, name, date, text). Comment form at bottom: textarea + "Comentar" button.

---

#### C. Admin Panel (`/admin`)

Left sidebar navigation (white background, border right):
- Brand name + "Panel Admin" subtitle at top
- Nav items with icon + label: Dashboard, Miembros, Planes, Pagos, Contenido, Comunidad, Configuración
- Active state: navy background, white text
- Inactive: muted text, hover light gray bg
- Bottom: "Cerrar sesión" with logout icon

11. **Admin Dashboard** — 3-column KPI cards grid. Each KPI card:
    - Colored icon container (blue/amber/green/purple/emerald)
    - Large number value
    - Label + description text
    - "Ver detalle →" micro-link
    - Below grid: amber alert banner when there are pending payments
    - Quick actions row: 4 outline buttons (Ver miembros, Revisar pagos, Gestionar planes, Subir contenido)

12. **Members table page** — Page header with member count. Full-width table: Nombre | Correo | Teléfono | Plan actual | Estado (colored badge) | Vence | Desde | Ver perfil button

13. **Member detail page** — Two columns:
    - Left: profile card with avatar placeholder, name, email, phone, role badge, member since
    - Right: subscription history table, active plan details

14. **Plans management page** — Table of plans + "Nuevo plan" button. Table: Nombre | Precio | Duración | Estado toggle | Editar button. Edit/Create plan dialog: name, description, price, currency selector, duration days, features list (add/remove), active toggle.

15. **Payments review page** — Table: Miembro | Plan | Comprobante (image thumbnail clickable) | Método | Monto | Estado badge | Fecha | Aprobar/Rechazar buttons. Reject modal with rejection reason textarea.

16. **Content management page** — Table with columns: Tipo (icon) | Título | Categoría (colored badge) | Planes | Estado badge | Publicar/Ocultar toggle. "Nuevo contenido" button opens right-side drawer/modal with: type selector, category dropdown, title, description, media URL or body textarea, plan multi-select checkboxes.

17. **Community moderation page** — Table: Título | Autor | Comentarios count | Estado (Visible/Hidden/Pinned badges) | Actions (Pin, Hide/Show, Delete icon buttons)

18. **Settings page** — Sections: Información del negocio (name, contact), Configuración de pago (SINPE number, instructions), Módulos activos (feature flag toggles with labels and descriptions).

---

### Component Library to Create

Design these reusable components:

- **StatusBadge** — pill badge variants: Active (green), Pending (amber), Expired/Rejected (red), Cancelled (gray outline), None (gray outline)
- **KPI Card** — colored icon container top right, large number, muted description, link bottom
- **Content Card** — type icon, category badge, title, description 2-line clamp, hover border highlight
- **Post Card** — pin indicator, title, author+date row, comment count
- **Plan Card** — name, price large, feature list, CTA button, optional highlighted border
- **Data Table** — header row, body rows with zebra stripe hover, empty state row
- **Modal/Dialog** — overlay, centered card, header with title + close X, scrollable body, footer with Cancel + Primary button
- **Alert Banner** — colored left border accent, icon, text, optional action button
- **Empty State** — centered icon (40-48px, muted), title, description, optional action button
- **Page Header** — title h1, description muted, optional right-side action button

---

### Responsive Breakpoints

- **Mobile** (`< 768px`): Stack all columns, bottom tab bar for portal nav, hamburger sidebar for admin
- **Tablet** (`768px–1024px`): 2-column grids, collapsible sidebar
- **Desktop** (`> 1024px`): Full layout as described above

---

### Design Tokens (CSS Variables)

```
--color-primary: #1E3A5F
--color-primary-hover: #2563EB
--color-primary-foreground: #FFFFFF
--color-accent: #F97316
--color-background: #FFFFFF
--color-surface: #F9FAFB
--color-text: #111827
--color-text-muted: #6B7280
--color-border: #E5E7EB
--color-success: #16A34A
--color-warning: #D97706
--color-danger: #DC2626
--radius-button: 8px
--radius-card: 12px
--radius-input: 6px
```

---

### Notes for the Designer

- Every text label visible in the UI should be in **Spanish** (this is a Latin American market product)
- The white-label nature means the primary color and brand name can be swapped per client — design with this flexibility in mind
- The platform currently supports: Gym studios, CrossFit boxes, dance schools, pilates centers
- Keep the admin panel feeling enterprise-grade (clean, data-dense, efficient) while the member portal feels welcoming and modern
