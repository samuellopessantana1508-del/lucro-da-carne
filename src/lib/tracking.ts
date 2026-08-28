declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    dataLayer: Record<string, unknown>[];
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

function gtmPush(data: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push(data);
  }
}

export function trackPageView() {
  fbq("track", "PageView");
  gtmPush({ event: "page_view" });
}

export function trackInitiateCheckout(plan: string, value: number) {
  fbq("track", "InitiateCheckout", {
    content_name: plan,
    content_category: "subscription",
    currency: "BRL",
    value,
  });
  gtmPush({
    event: "initiate_checkout",
    plan,
    value,
    currency: "BRL",
  });
}

export function trackPurchase(plan: string, value: number, transactionId?: string) {
  fbq("track", "Purchase", {
    content_name: plan,
    content_category: "subscription",
    currency: "BRL",
    value,
  });
  gtmPush({
    event: "purchase",
    plan,
    value,
    currency: "BRL",
    transaction_id: transactionId || "",
  });
}

export function trackSignUp() {
  fbq("track", "CompleteRegistration");
  gtmPush({ event: "sign_up" });
}

export function trackLead() {
  fbq("track", "Lead");
  gtmPush({ event: "generate_lead" });
}
