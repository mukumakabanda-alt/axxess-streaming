import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, Zap } from "lucide-react";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";
import { ServicesTab } from "@/components/admin/ServicesTab";
import { TestimonialsTab } from "@/components/admin/TestimonialsTab";
import { UpdatesTab } from "@/components/admin/UpdatesTab";
import { ReferralsTab } from "@/components/admin/ReferralsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const auth = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.loading && (!auth.isAuthed || !auth.isAdmin)) {
      navigate({ to: "/admin/login" });
    }
  }, [auth, navigate]);

  if (auth.loading || !auth.isAuthed || !auth.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow-red">
              <Zap className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-none">Axxess Admin</p>
              <p className="text-[10px] text-muted-foreground">{auth.email}</p>
            </div>
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/admin/login" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your business in one place.</p>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="subs">Subscriptions</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="updates">News</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="orders" className="mt-6"><OrdersTab /></TabsContent>
          <TabsContent value="subs" className="mt-6"><SubscriptionsTab /></TabsContent>
          <TabsContent value="services" className="mt-6"><ServicesTab /></TabsContent>
          <TabsContent value="testimonials" className="mt-6"><TestimonialsTab /></TabsContent>
          <TabsContent value="updates" className="mt-6"><UpdatesTab /></TabsContent>
          <TabsContent value="referrals" className="mt-6"><ReferralsTab /></TabsContent>
          <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
