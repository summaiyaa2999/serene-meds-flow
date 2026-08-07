import { Stethoscope, Percent, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-shop";
import { whatsappLink, WHATSAPP_NUMBER } from "@/lib/shop";

const MESSAGE =
  "Hello Dawaiin, I am a doctor/wholesaler. Sharing my identity and requirements for wholesale pricing:";

export function DoctorsSection() {
  const { settings } = useSettings();

  return (
    <section id="wholesale" className="bg-cream py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="reveal overflow-hidden rounded-[2rem] border bg-card p-8 shadow-[var(--shadow-lift)] sm:p-12">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="eyebrow">Partner with us</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">For Doctors &amp; Wholesalers</h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
                The company will provide the best-prized services to Doctors and wholesalers with attractive
                discounts of up to 40%. To avail of this service, they can send a message on WhatsApp with their
                identity and requirements.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-5">
                  <Percent className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Up to 40% discount</p>
                    <p className="mt-1 text-xs text-muted-foreground">Best-prized trade rates on bulk orders</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-5">
                  <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Verified partners</p>
                    <p className="mt-1 text-xs text-muted-foreground">Share your identity &amp; requirements</p>
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="mt-8 rounded-full px-8">
                <a
                  href={whatsappLink(settings.whatsappNumber || WHATSAPP_NUMBER, MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Message us on WhatsApp
                </a>
              </Button>
            </div>

            <div className="hidden h-40 w-40 place-items-center rounded-full bg-[image:var(--gradient-leaf)] text-primary-foreground md:grid">
              <Stethoscope className="h-16 w-16" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
