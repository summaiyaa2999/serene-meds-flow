# WhatsApp open — multi-format fallback

Today the order flow builds one WhatsApp URL (`web.whatsapp.com/send`) and pushes the pre-opened tab straight to it. If that URL is blocked, filtered, or the device has no WhatsApp Web session, the user sees a dead tab and nothing else happens.

## What changes

When "Send Order on WhatsApp" is clicked, try each link format in order until one visibly succeeds:

1. `whatsapp://send?phone=...&text=...` — native app deep link (best on mobile, instant if the app is installed)
2. `https://web.whatsapp.com/send?phone=...&text=...` — current behaviour, best on desktop
3. `https://wa.me/<number>?text=...` — universal short link

Order is device-aware: on mobile the deep link goes first; on desktop the web chat goes first, deep link last.

If every attempt fails (tab stays blank/closed, or nothing loads within a short timeout), show a toast:

> Couldn't open WhatsApp. Tap to copy your order and send it to +91 7078718575.

with a "Copy order" action that copies the full order message to the clipboard, so the order is never lost.

## How the fallback detects failure

A blocked navigation cannot be observed directly, so:

- The tab opened during the click is navigated to candidate 1.
- After a short delay (~1.2s) the tab is checked: if it closed itself (app handoff) or navigated away from `about:blank`, treat as success and stop.
- Otherwise navigate the same tab to the next candidate and repeat.
- After the last candidate, close the tab and raise the toast.
- If the popup was blocked entirely (no tab), fall back to navigating the current page to the first candidate, and if the page is still here after the delay, show the toast.

## Technical notes

- All logic lands in `src/lib/shop.ts`: `whatsappLink` becomes `whatsappLinks(number, message)` returning the ordered candidate array (still `encodeURIComponent`-encoded, still forcing the `91` country code with the `917078718575` default), and `openWhatsApp` becomes an async cascade over that array.
- `src/components/shop/CartSheet.tsx` keeps its existing synchronous `window.open("", "_blank")` during the click and passes that tab plus the message into the new `openWhatsApp`; it also passes the raw message so the toast's copy action has it.
- Toast uses the existing `sonner` import already present in `CartSheet.tsx`.
- Any other caller of `whatsappLink` (per-product enquiry buttons) is updated to the new helper.
- No UI, styling, pricing, database, or admin changes.
