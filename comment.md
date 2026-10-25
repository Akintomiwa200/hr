# Demo mode — payment gating disabled

The subscription/payment locks are temporarily **commented out** so every feature
is accessible for the demo. Nothing was deleted — just uncomment the marked
blocks below to restore the paid-gating behaviour.

> Look for the marker: `DEMO MODE: ... — see comment.md to re-enable.`

---

## 1. `app/(dashboard)/layout.tsx`

### a) Gate imports (top of file)

```tsx
// DEMO MODE: payment gates disabled — see comment.md to re-enable.
// import { LockGate } from "@/components/subscription/lock-gate";
// import { PlanFeatureGate } from "@/components/gates/plan-feature-gate";
```

Uncomment both imports when re-enabling (the PlanFeatureGate import is needed
again for the wrapper in step c).

### b) Locked-workspace screen

```tsx
// DEMO MODE: payment gates disabled — see comment.md to re-enable.
// const companyLocked = session.companyId ? !!company?.isLocked : false;
// const companyPlan = company?.plan ?? null;

// DEMO MODE: locked-workspace screen disabled — see comment.md to re-enable.
// Locked workspaces only expose the subscription setup screen until a plan
// is tied to the account — the gate unlocks in real time via SSE.
// if (companyLocked) {
//   return (
//     <CurrencyProvider currencyCode={currencyCode}>
//       <NavProvider initialSummary={navSummary}>
//         <LockGate initiallyLocked>{children}</LockGate>
//       </NavProvider>
//     </CurrencyProvider>
//   );
// }
```

Uncomment the two `const` lines **and** the whole `if (companyLocked) { ... }`
block. This is the full-screen "workspace locked until payment" screen.

### c) Plan/feature gate wrapper (bottom of file)

Currently:

```tsx
{/* DEMO MODE: plan/feature gate disabled — see comment.md to re-enable. */}
{/* <PlanFeatureGate planId={session.companyId ? companyPlan : null}> */}
{children}
{/* </PlanFeatureGate> */}
```

Restore to:

```tsx
<PlanFeatureGate planId={session.companyId ? companyPlan : null}>
  {children}
</PlanFeatureGate>
```

This gate is what was hiding higher-tier pages (Performance, Recruitment,
Loans, Integrations, Audit, Bulk messaging, Budget, etc.) on the Free plan.

---

## 2. `lib/api-auth.ts` — `requireSession()`

```ts
// DEMO MODE: payment lock disabled — see comment.md to re-enable.
// Locked companies cannot use business APIs until a subscription is tied.
// The subscription/events/auth endpoints use getSession() directly, so they
// keep working so the workspace can be unlocked in real time.
// if (session.locked) return null;
return session;
```

Uncomment `if (session.locked) return null;` to make ~100 business API routes
return 401 while a company is locked.

---

## 3. `lib/subscription.ts` — `assertCanAddEmployee()`

The whole subscription/limit body is commented out, so adding employees is
never blocked by plan, lock, trial expiry or the employee cap:

```ts
export async function assertCanAddEmployee(companyId: string | null | undefined) {
  if (!companyId) return;

  // DEMO MODE: subscription/employee limits disabled — see comment.md to re-enable.
  // const sub = await getCompanySubscription(companyId);
  // if (!sub) return;
  // if (sub.isLocked) throw new Error("SUBSCRIPTION_LOCKED");
  // if (!sub.isActive) throw new Error("SUBSCRIPTION_INACTIVE");
  // if (sub.status === "CANCELLED" || sub.status === "PAST_DUE") throw new Error("SUBSCRIPTION_EXPIRED");
  // if (sub.status === "TRIAL" && sub.daysLeftInTrial === 0) throw new Error("TRIAL_EXPIRED");
  // if (!sub.canAddEmployees) throw new Error("EMPLOYEE_LIMIT");
}
```

Uncomment the body to restore plan limits.

---

## What is left in place (not blocking)

- `components/subscription/lock-gate.tsx` and
  `components/gates/plan-feature-gate.tsx` still exist but are no longer
  rendered anywhere. Safe to keep.
- `lib/auth.ts` still sets `session.locked`, but nothing enforces it while the
  checks above are commented out.
- Signup still marks paid-plan signups as `isLocked: true`; that has **no
  effect** while the gates are disabled. If a demo account signs up on a paid
  plan, only the Settings → Subscription page will show the "finish payment"
  card — the rest of the app is fully usable.
- Pricing is now displayed in **Naira** (see `lib/subscription-plans.ts`):
  Basic ₦9,000/mo · Pro ₦18,000/mo · Advanced ₦27,000/mo.
- `.env` has `SELAR_WEBHOOK_TOKEN` active (generated) plus the three
  `SELAR_*_LINK` values.

---

## How to re-enable paid gating (checklist)

1. `app/(dashboard)/layout.tsx` — uncomment (a), (b) and restore the wrapper in (c).
2. `lib/api-auth.ts` — uncomment `if (session.locked) return null;`.
3. `lib/subscription.ts` — uncomment the `assertCanAddEmployee` body.
4. Make sure each company has a valid plan (`Settings → Subscription`, or the
   admin Companies page) and `isLocked = false` unless you want it locked.
5. Restart the dev server (env/compile changes) if needed.
