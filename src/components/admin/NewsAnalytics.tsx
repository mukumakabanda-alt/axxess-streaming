import { useEffect, useState } from "react";

const API_BASE = "https://axxess-news-engine.manus.space";

type Article = { title: string; views?: number; ctaClicks?: number; conversions?: number };
type Dashboard = {
  totalViews?: number;
  totalClicks?: number;
  totalConversions?: number;
  netflixViews?: number;
  primeViews?: number;
  dstvViews?: number;
  topArticles?: Article[];
  lastRefresh?: string;
  articlesGenerated?: number;
  notificationsSent?: number;
};

export function NewsAnalytics() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/trpc/analytics.getDashboard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (mounted) {
          setData(json?.result?.data ?? {});
          setError(null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load analytics");
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const d = data ?? {};
  const rate = (d.totalClicks ?? 0) > 0 ? Math.round(((d.totalConversions ?? 0) / (d.totalClicks ?? 1)) * 100) : 0;
  const fmt = (n?: number) => (n ?? 0).toLocaleString();

  const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="rounded-lg p-5" style={{ background: `linear-gradient(135deg, #1a1a1a 0%, ${color}22 100%)`, borderLeft: `4px solid ${color}` }}>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );

  return (
    <div className="rounded-2xl bg-[#0a0a0a] p-5 text-white">
      <h2 className="mb-5 text-xl font-bold" style={{ color: "#ff1744" }}>📊 Axxess News Engine Analytics</h2>

      {error && <p className="mb-3 text-xs text-destructive">Live analytics unavailable: {error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Views" value={fmt(d.totalViews)} color="#ff1744" />
        <Stat label="CTA Clicks" value={fmt(d.totalClicks)} color="#ffd700" />
        <Stat label="Conversions" value={fmt(d.totalConversions)} color="#00ff88" />
        <Stat label="Conversion Rate" value={`${rate}%`} color="#ff6b00" />
      </div>

      <h3 className="mt-7 mb-3 text-base font-bold" style={{ color: "#ffd700" }}>🔥 Top Articles</h3>
      <div className="grid gap-3">
        {(d.topArticles?.length ?? 0) === 0 ? (
          <div className="rounded-lg bg-[#1a1a1a] p-5 text-center text-sm text-neutral-500">No article data yet.</div>
        ) : (
          d.topArticles!.slice(0, 5).map((a, i) => (
            <div key={i} className="rounded-lg bg-[#1a1a1a] p-4" style={{ borderLeft: "4px solid #ffd700" }}>
              <h4 className="mb-2 text-sm font-bold text-white">{a.title}</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[10px] font-bold" style={{ color: "#ff1744" }}>VIEWS</div><div className="text-lg font-bold text-white">{fmt(a.views)}</div></div>
                <div><div className="text-[10px] font-bold" style={{ color: "#ffd700" }}>CLICKS</div><div className="text-lg font-bold text-white">{fmt(a.ctaClicks)}</div></div>
                <div><div className="text-[10px] font-bold" style={{ color: "#00ff88" }}>CONV.</div><div className="text-lg font-bold text-white">{fmt(a.conversions)}</div></div>
              </div>
            </div>
          ))
        )}
      </div>

      <h3 className="mt-7 mb-3 text-base font-bold" style={{ color: "#ff1744" }}>📺 Platform Breakdown</h3>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Netflix" value={fmt(d.netflixViews)} color="#e50914" />
        <Stat label="Prime Video" value={fmt(d.primeViews)} color="#00a8e1" />
        <Stat label="DStv" value={fmt(d.dstvViews)} color="#C9A84C" />
      </div>

      <h3 className="mt-7 mb-3 text-base font-bold" style={{ color: "#ffd700" }}>⚙️ Automation Status</h3>
      <div className="rounded-lg bg-[#1a1a1a] p-5" style={{ borderLeft: "4px solid #ffd700" }}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-bold" style={{ color: "#ffd700" }}>LAST REFRESH</div>
            <div className="mt-1 text-sm text-white">{d.lastRefresh ? new Date(d.lastRefresh).toLocaleString() : "Never"}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold" style={{ color: "#ffd700" }}>ARTICLES GENERATED</div>
            <div className="mt-1 text-sm text-white">{fmt(d.articlesGenerated)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold" style={{ color: "#ffd700" }}>NOTIFICATIONS SENT</div>
            <div className="mt-1 text-sm text-white">{fmt(d.notificationsSent)}</div>
          </div>
        </div>
      </div>
    </div>
  );
          }
