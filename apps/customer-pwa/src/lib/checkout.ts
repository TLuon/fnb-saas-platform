export interface CheckoutCartItem {
  productId: string;
  quantity: number;
  price?: number;
  modifiers?: unknown;
  note?: string;
}

export function buildOrderItemPayload(item: CheckoutCartItem, orderNote?: string) {
  const note = item.note || orderNote;

  return {
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.price,
    modifiers: {
      ...(item.modifiers ? { selections: item.modifiers } : {}),
      ...(note ? { note } : {}),
    },
  };
}

export function getSafeReturnUrl(search: string, fallback = '/floors') {
  const requestedUrl = new URLSearchParams(search).get('returnUrl');
  if (
    requestedUrl && 
    requestedUrl.startsWith('/') && 
    !requestedUrl.startsWith('//') && 
    !requestedUrl.startsWith('/login')
  ) {
    return requestedUrl;
  }
  return fallback;
}

export function unwrapOrderDetails(payload: any) {
  return payload?.order
    ?? payload?.data?.order
    ?? payload?.data?.data?.order
    ?? payload?.data
    ?? payload;
}
