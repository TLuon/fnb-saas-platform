import type { PassPlan } from '../components/coffee-pass/PassPlanCard';

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;

export function normalizePassPlans(response: unknown): PassPlan[] {
  const payload = unwrap(response);
  const list = Array.isArray(payload?.plans) ? payload.plans : Array.isArray(payload) ? payload : [];

  return list
    .filter((plan: any) => plan && plan.id && plan.name)
    .map((plan: any) => ({
      id: String(plan.id),
      name: String(plan.name),
      price: Number(plan.price ?? 0),
      total_redemptions: Number(plan.total_redemptions ?? 0),
      duration_days: Number(plan.valid_days ?? plan.duration_days ?? 0),
      description: plan.description ? String(plan.description) : undefined,
    }));
}

export function normalizeWalletBalance(response: unknown): number {
  const payload = unwrap(response) ?? {};
  return Number(payload.main_balance ?? 0) + Number(payload.promo_balance ?? 0);
}

export function extractSubscription(response: any) {
  const payload = unwrap(response) ?? {};
  return payload.subscription ?? null;
}
