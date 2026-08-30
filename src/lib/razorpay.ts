/**
 * @deprecated Razorpay integration has been deprecated and replaced by Cashfree.
 * Use getCashfreeInstance() and createCashfreeOrderSession() from '@/lib/cashfree'.
 */
export async function payWithRazorpay(): Promise<never> {
  throw new Error("Razorpay integration has been replaced by Cashfree payment gateway.");
}
