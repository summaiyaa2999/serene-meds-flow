import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "../shop";

describe("Cart Storage and Count Logic", () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => storage[k] ?? null,
        setItem: (k: string, v: string) => {
          storage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete storage[k];
        },
        clear: () => {
          storage = {};
        },
      },
      dispatchEvent: vi.fn(),
      CustomEvent: class CustomEvent {
        constructor(public type: string) {}
      },
    };
  });

  it("should return an empty array when cart storage is empty or cleared", () => {
    expect(store.getCart()).toEqual([]);
  });

  it("should remove dawaiin.cart key from localStorage when setting empty cart", () => {
    const spyRemove = vi.spyOn((globalThis as any).window.localStorage, "removeItem");
    store.setCart([{ id: "prod-1", qty: 2 }]);
    expect(store.getCart()).toHaveLength(1);

    store.setCart([]);
    expect(spyRemove).toHaveBeenCalledWith("dawaiin.cart");
    expect(store.getCart()).toEqual([]);
    expect(storage["dawaiin.cart"]).toBeUndefined();
  });

  it("should sanitize invalid or zero quantity lines when writing and reading cart", () => {
    store.setCart([
      { id: "prod-1", qty: 3 },
      { id: "", qty: 1 },
      { id: "prod-2", qty: 0 },
    ]);

    const result = store.getCart();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("prod-1");
    expect(result[0].qty).toBe(3);
  });
});
