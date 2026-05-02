import { Link } from "@tanstack/react-router";
import { WHATSAPP_PRIMARY } from "@/lib/whatsapp";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="font-display text-xl font-bold">
              Axxess<span className="text-primary">.</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Premium entertainment access in Zambia. Fast. Affordable. Reliable.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Quick links</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#plans" className="hover:text-foreground">Pricing</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              <li><Link to="/admin/login" className="hover:text-foreground">Admin</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>+260 76 510 1494</li>
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_PRIMARY}`}
                  className="text-primary hover:underline"
                >
                  Chat on WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Axxess Streaming. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
