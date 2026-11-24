import gta from "@/assets/gta5_gameplay.mp4.asset.json";
import gtaPoster from "@/assets/gta5_gameplay.jpg.asset.json";
import fc from "@/assets/fc27_gameplay.mp4.asset.json";
import fcPoster from "@/assets/fc27_gameplay.jpg.asset.json";
import nfs from "@/assets/nfs_heat_gameplay.mp4.asset.json";
import nfsPoster from "@/assets/nfs_heat_gameplay.jpg.asset.json";

const clips = [
  { title: "FC 27", src: fc.url, poster: fcPoster.url, portrait: false },
  { title: "GTA 5", src: gta.url, poster: gtaPoster.url, portrait: false },
  { title: "Need for Speed Heat", src: nfs.url, poster: nfsPoster.url, portrait: true },
];

// preload="none" keeps the page light: nothing downloads until a visitor taps play.
export function GameplayClips() {
  return (
    <div className="mt-10 border-b border-border pb-8">
      <h2 className="text-xl font-semibold">See it in action</h2>
      <p className="mt-2 text-sm text-muted-foreground">Real gameplay, filmed on our rental consoles.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {clips.map((c) => (
          <figure key={c.title}>
            <video src={c.src} poster={c.poster} controls playsInline preload="none" className={`w-full rounded-lg bg-card object-cover ${c.portrait ? "aspect-[9/16] sm:aspect-[9/16]" : "aspect-video sm:aspect-[9/16]"}`} />
            <figcaption className="mt-2 text-sm font-medium">{c.title}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
