import { createServerFn } from "@tanstack/react-start";
import { createCashfreeOrderSession, type CreateCashfreeOrderParams } from "../../lib/cashfree";

export const createCashfreeOrderFn = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: CreateCashfreeOrderParams }) => {
    return await createCashfreeOrderSession(data);
  });
