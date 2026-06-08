import { Link } from "@tanstack/react-router";
import { WHATSAPP_PRIMARY } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card pb-28">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">

          {/* Brand */}
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">
              Axxess<span className="text-primary">.</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Zambia's premium streaming access platform. Fast activation, no contracts, delivered via WhatsApp.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Navigate
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a href="/#plans" className="text-foreground/70 transition-colors hover:text-foreground">Pricing</a></li>
              <li><a href="/#how" className="text-foreground/70 transition-colors hover:text-foreground">How it works</a></li>
              <li><Link to="/trial" className="text-foreground/70 transition-colors hover:text-foreground">Free Trial</Link></li>
              <li><Link to="/rewards" className="text-foreground/70 transition-colors hover:text-foreground">Rewards</Link></li>
              <li><Link to="/news" className="text-foreground/70 transition-colors hover:text-foreground">News</Link></li>
              <li><Link to="/contact" className="text-foreground/70 transition-colors hover:text-foreground">Support</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="text-foreground/70">+260 76 510 1494</li>
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_PRIMARY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat on WhatsApp
                </a>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-border pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Axxess Entertainment. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Zambia's #1 streaming deal.
          </p>
        </div>
      </div>
    </footer>
  );
                }
