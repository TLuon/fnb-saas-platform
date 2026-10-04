<style>
  :root{
    --primary:#543310;   /* dark brown */
    --secondary:#D67D3E; /* orange */
    --accent:#FED8B1;    /* light peach */
    --neutral:#FAF7F3;   /* off-white */
  }
  body { background: var(--neutral); color: #222; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
  h1 { color: var(--primary); border-bottom: 3px solid var(--secondary); padding-bottom: .2em; }
  h2 { color: var(--secondary); }
  h3 { color: var(--primary); }
  blockquote { background: linear-gradient(90deg, rgba(214,125,62,0.06), rgba(254,216,177,0.06)); border-left: 6px solid var(--secondary); padding: .6em 1em; margin: .6em 0; }
  table th { background: var(--secondary); color: white; padding: .4em; }
  table td { background: #fff; padding: .4em; }
  .swatch { display:inline-block; width:2.6rem; height:1.6rem; margin-right:.4rem; border-radius:4px; border:1px solid rgba(0,0,0,0.06); vertical-align:middle }
  pre, code { background: #fff4eb; padding:.2em .4em; border-radius:4px; }
</style>

# F&B Platform — Consolidated Reference

_Merged from: [SPEC.md](SPEC.md), [PLAN_BE.md](PLAN_BE.md), [ERROR_CODES.md](ERROR_CODES.md), [RLS_POLICIES.md](RLS_POLICIES.md), [REALTIME_EVENTS.md](REALTIME_EVENTS.md)_

## Palette
- Primary: <span class="swatch" style="background:#543310"></span> `#543310`
- Secondary: <span class="swatch" style="background:#D67D3E"></span> `#D67D3E`
- Accent: <span class="swatch" style="background:#FED8B1"></span> `#FED8B1`
- Neutral: <span class="swatch" style="background:#FAF7F3"></span> `#FAF7F3`

---

## **Specification (SPEC)**

### Context & Goal
- Multi-tenant F&B SaaS with realtime floor map, VietQR mock payment, KDS, group-order, and CDP features.

### Roles
- `OWNER`: management and configuration
- `STAFF`: POS, floor operations, KDS
- `CUSTOMER`: reservation, group-order, payments
- `SUPPORT`: CSKH, unmatched transactions, maker-checker

### MVP Scope (high level)
- Auth + RBAC + RLS
- Floor Editor + Live Floor Map (Supabase Realtime for `tables`)
- Reservation lock (Redis TTL 10m) + VietQR mock + webhook
- Orders, KDS (Socket.IO), Group-Order (Redis session)
- Payment flows → `trg_order_completed` trigger updates CDP fields
- Support: `unmatched_transactions`, fuzzy match via `pg_trgm`, Maker-Checker

### Standardized statuses (reference)
| Entity | Column | Values |
|---|---|---|
| tables | status | AVAILABLE, PENDING_LOCK, RESERVED, OCCUPIED, CLEANING |
| orders | status | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| order_items | kitchen_status | QUEUED, PREPARING, READY, SERVED |

---

## **Backend Plan (PLAN_BE) — Summary**

### Principles
- Single shared DB schema managed by B1 (DB Lead). All schema changes go through migrations.
- B1 owns DDL, RLS and shared infra; B2 implements business flows that depend on that schema.

### Module split
- B1: Auth, Floor & Table, Menu, Staff Management, CDP/Reports, DB infra
- B2: Reservation & Payment, Orders/KDS, Group-Order, Wallet & Coffee Pass, Support

### Key deliverables
- Migrations + seed data, Supabase Auth config, `custom_access_token_hook`, RLS policies
- Redis-based reservation lock and group-order session
- Socket.IO integration for KDS, group-order, support board

---

## **Error Codes (ERROR_CODES) — Quick Reference**

| Area | Example Code | Meaning |
|---|---:|---|
| Auth | `ERR_1001_UNAUTHORIZED` | Missing/invalid JWT |
| Table | `ERR_2002_TABLE_LOCKED` | Table locked by other user (Redis TTL) |
| Reservation | `ERR_3001_RESERVATION_EXPIRED` | Lock TTL expired |
| Order | `ERR_4003_EMPTY_ORDER_SUBMIT` | Submit to kitchen with no items |
| Group-Order | `ERR_5001_SESSION_NOT_FOUND` | Redis session missing |
| Support | `ERR_6001_UNMATCHED_TX_NOT_FOUND` | Unmatched transaction not found |
| General | `ERR_9001_VALIDATION_FAILED` | DTO validation failed |

Refer to [ERROR_CODES.md](ERROR_CODES.md) for the full canonical list.

---

## **RLS & JWT Claims (RLS_POLICIES)**

### JWT custom claims
- `role_app` (avoid overriding `role`), `tenant_id`, `branch_id`, `sub` (auth user id)

### Helper SQL functions (used by policies)
- `auth.tenant_id()`, `auth.role_app()`, `auth.branch_id()` — read from `request.jwt.claims`.

### Tenant boundary
- RLS enabled on tenant-scoped tables. `tenant_boundary` policies are RESTRICTIVE and are ANDed with role policies.

### Role policies (overview)
- Read-only resources allow `OWNER`, `STAFF`, `SUPPORT`, `CUSTOMER` as appropriate.
- Owner-only write/update for config tables. Staff/Customer limited per table semantics.

Refer to [RLS_POLICIES.md](RLS_POLICIES.md) for full policy SQL snippets.

---

## **Realtime Events (REALTIME_EVENTS)**

### Channel naming conventions
- `tables:{branch_id}` — Supabase Realtime (table row changes)
- `kds:{branch_id}` — Socket.IO events for KDS
- `group_order:{tenant_id}:{table_id}` — group-order session via Redis + Socket.IO
- `support:{tenant_id}` — support board events

### Key events
- `table_status_changed` — channel `tables:{branch_id}`, payload contains `table_id`, `old_status`, `new_status`, `current_order_id`
- `kds_new_ticket` / `kds_item_status_changed` — KDS flows
- `group_order_cart_updated` — broadcast from Redis session
- `unmatched_transaction_created` / `support_ticket_urgent_created` — support notifications

### Reconnect & resync rules
- On reconnect to `tables:{branch_id}` call `GET /floors/:id/tables` to snapshot state before resuming diffs.
- For `group_order`, on reconnect call `GET /group-order/:tableId/cart` to resync Redis session.

Refer to [REALTIME_EVENTS.md](REALTIME_EVENTS.md) for full payload examples and channel mapping.

---

## Notes & Next steps
- This consolidated file uses the provided color palette for visual consistency.
- For a printable or presentation-ready theme, export as HTML/PDF or ask me to generate an HTML version.

---

_Generated as a consolidated reference — keep the source files authoritative and update them first; then sync this file when you want a single-theme view._
