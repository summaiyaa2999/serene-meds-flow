import { createServerFn } from "@tanstack/react-start";
import { processCashfreeWebhookRequest } from "../../lib/cashfree-webhook-handler";

export const cashfreeWebhookFn = createServerFn({ method: "POST" })
  .handler(async ({ request }: { request: Request }) => {
    return await processCashfreeWebhookRequest(request);
  });
