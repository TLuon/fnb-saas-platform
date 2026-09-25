export interface CheckoutCartItem {
  productId: string;
  quantity: number;
  modifiers?: unknown;
  note?: string;
}

export function buildOrderItemPayload(item: CheckoutCartItem, orderNote?: string) {
  const note = item.note || orderNote;

  return {
    product_id: item.productId,
    quantity: item.quantity,
    modifiers: {
      ...(item.modifiers ? { selections: item.modifiers } : {}),
      ...(note ? { note } : {}),
    },
  };
}

export function getSafeReturnUrl(search: string, fallback = '/menu') {
  const requestedUrl = new URLSearchParams(search).get('returnUrl');
  return requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//')
    ? requestedUrl
    : fallback;
}

export function unwrapOrderDetails(payload: any) {
  return payload?.order
    ?? payload?.data?.order
    ?? payload?.data?.data?.order
    ?? payload?.data
    ?? payload;
}
