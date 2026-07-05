import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2, LogOut } from "lucide-react";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { TestimonialsTab } from "@/components/admin/TestimonialsTab";
import { UpdatesTab } from "@/components/admin/UpdatesTab";
import { ReferralsTab } from "@/components/admin/ReferralsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { ReservationsTab } from "@/components/admin/ReservationsTab";
import { NetflixAccountsTab } from "@/components/admin/NetflixAccountsTab";
import { PrimeVideoAccountsTab } from "@/components/admin/PrimeVideoAccountsTab";
import {
  LayoutDashboard, ShoppingCart, Users, Package,
  BookOpen, Megaphone, Share2, Settings, Calendar,
  Tv, PlayCircle, ChevronRight, Menu, X, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/admin/")(({
  head: () => ({
    meta: [
      { title: "Axxess Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
}));

type TabId =
  | "overview" | "orders" | "reservations" | "subs"
  | "services" | "netflix" | "prime"
  | "testimonials" | "updates" | "referrals" | "settings";

const NAV: { id: TabId; label: string; icon: any; badge?: string }[] = [
  { id: "overview",     label: "Overview",      icon: LayoutDashboard },
  { id: "orders",       label: "Orders",        icon: ShoppingCart },
  { id: "reservations", label: "Reservations",  icon: Calendar },
  { id: "subs",         label: "Subscriptions", icon: Users },
  { id: "services",     label: "Services",      icon: Package },
  { id: "netflix",      label: "Netflix",       icon: Tv },
  { id: "prime",        label: "Prime Video",   icon: PlayCircle },
  { id: "testimonials", label: "Testimonials",  icon: BookOpen },
  { id: "updates",      label: "News/Updates",  icon: Megaphone },
  { id: "referrals",    label: "Referrals",     icon: Share2 },
  { id: "settings",     label: "Settings",      icon: Settings },
];

function AdminPage() {
  const { loading, isAdmin, signOut } = useAdminAuth();
  const [active, setActive] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  const current = NAV.find((n) => n.id === active)!;


  const handleNav = (id: TabId) => {
    setActive(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#080808] text-foreground">

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-[#0c0c0c] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "#E5192A" }}
            >
              <span className="text-xs font-black text-white">AX</span>
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Axxess</p>
              <p className="text-[10px] text-muted-foreground">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all"
                style={{
                  background:  isActive ? "rgba(229,25,42,0.12)" : "transparent",
                  color:       isActive ? "#E5192A" : "rgba(255,255,255,0.5)",
                  borderLeft:  isActive ? "2px solid #E5192A" : "2px solid transparent",
                }}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-4 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View live site
          </Link>
          <div className="rounded-xl px-3 py-2" style={{ background: "rgba(229,25,42,0.06)", border: "1px solid rgba(229,25,42,0.15)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#E5192A" }}>Axxess Entertainment</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">WhatsApp: +260 770 514 809</p>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-[#0c0c0c]/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <current.icon className="h-4 w-4 text-primary" />
            <h1 className="font-display text-base font-bold">{current.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Live site
            </Link>
            <div
              className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(229,25,42,0.1)", color: "#E5192A", border: "1px solid rgba(229,25,42,0.2)" }}
            >
              Admin
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6">
          {active === "overview"     && <OverviewTab />}
          {active === "orders"       && <OrdersTab />}
          {active === "reservations" && <ReservationsTab />}
          {active === "subs"         && <SubscriptionsTab />}
          {active === "services"     && <ServicesTab />}
          {active === "netflix"      && <NetflixAccountsTab />}
          {active === "prime"        && <PrimeVideoAccountsTab />}
          {active === "testimonials" && <TestimonialsTab />}
          {active === "updates"      && <UpdatesTab />}
          {active === "referrals"    && <ReferralsTab />}
          {active === "settings"     && <SettingsTab />}
        </main>
      </div>
    </div>
  );
   }
