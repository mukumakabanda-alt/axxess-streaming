import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/axxess-entertainment-logo.png.asset.json";
const logo = logoAsset.url;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center" aria-label="Axxess Streaming home">
          <img
            src={logo}
            alt="Axxess Streaming"
            className="h-9 w-auto sm:h-10 select-none"
            draggable={false}
          />
        </Link>
        <Link to="/" hash="plans" className="btn-primary-cta !px-5 !py-2 !text-xs">
          Order
        </Link>
      </div>
    </header>
  );
}
