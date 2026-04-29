import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "How do I order?", a: "Pick a plan, fill in the form, and continue on WhatsApp. We confirm and share payment details." },
  { q: "How do I pay?", a: "Mobile Money (MTN/Airtel) or bank transfer. We'll guide you through it on WhatsApp." },
  { q: "How fast do I get access?", a: "Usually within 5–15 minutes after we confirm payment, sent to your WhatsApp." },
  { q: "What happens at renewal?", a: "We send you a friendly WhatsApp reminder a few days before your subscription expires." },
  { q: "Is this safe & reliable?", a: "Yes. We've delivered hundreds of subscriptions with happy customers — see the testimonials section." },
  { q: "Can I cancel anytime?", a: "Yes. Just don't renew — there's no auto-charge. You're in full control." },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Common questions</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 rounded-3xl border border-border gradient-card px-6">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
