declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function payWithRazorpay(opts: {
  keyId: string;
  amount: number;
  name: string;
  contact: string;
  description: string;
}): Promise<string> {
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) throw new Error("Razorpay could not be loaded");

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: opts.keyId,
      amount: Math.round(opts.amount * 100),
      currency: "INR",
      name: "Dawaiin Ayurvedic Apothecary",
      description: opts.description,
      prefill: { name: opts.name, contact: opts.contact },
      theme: { color: "#4b6b46" },
      handler: (res: { razorpay_payment_id: string }) => resolve(res.razorpay_payment_id),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
