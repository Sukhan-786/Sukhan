import Link from "next/link";
import { Icon } from "./icon";
const links = [
  { label: "POETS", href: "/artists" },
  { label: "KALAM", href: "/catalogue" },
  { label: "AUDIO", href: "/media?kind=audio" },
  { label: "VIDEOS", href: "/media?kind=video" },
];
function MoreLinks() {
  return (
    <>
      <Link href="/catalogue?form=ghazal">Ghazals</Link>
      <Link href="/catalogue?form=nazm">Nazms</Link>
      <Link href="/catalogue?form=sher">Couplets</Link>
      <Link href="/artists">Poets & artists</Link>
      <Link href="/admin">Editorial studio</Link>
    </>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="header-row">
        <div className="brand-group">
          <details className="mobile-menu">
            <summary aria-label="Open navigation">
              <Icon name="menu" />
            </summary>
            <nav aria-label="Expanded navigation">
              <MoreLinks />
            </nav>
          </details>
          <Link href="/" className="brand" aria-label="Sukhan home">
            sukhan
          </Link>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((l) => (
            <Link key={l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
          <details className="more-menu">
            <summary>MORE</summary>
            <div className="dropdown">
              <MoreLinks />
            </div>
          </details>
        </nav>
        <form
          action="/catalogue"
          className="header-search"
          role="search"
          aria-label="Site search"
        >
          <button type="submit" aria-label="Search Sukhan">
            <Icon name="search" size={18} />
          </button>
          <label className="sr-only" htmlFor="header-search">
            Search Sukhan
          </label>
          <input
            id="header-search"
            type="search"
            name="q"
            placeholder="Search"
            maxLength={160}
          />
        </form>
        <div className="header-tools">
          <span
            className="header-locale"
            aria-label="Interface language: English"
          >
            ENG
          </span>
          <Link className="header-login" href="/login">
            LOG IN
          </Link>
          <details className="site-grid">
            <summary aria-label="Explore Sukhan sections">
              <Icon name="grid" size={21} />
            </summary>
            <nav className="dropdown" aria-label="Sukhan sections">
              <MoreLinks />
            </nav>
          </details>
          <Link className="header-cta" href="/catalogue">
            Explore
          </Link>
          <Link className="header-cta header-outline" href="/admin">
            Studio
          </Link>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map((l) => (
          <Link key={l.label} href={l.href}>
            {l.label}
          </Link>
        ))}
        <Link href="/catalogue?form=prose">PROSE</Link>
      </nav>
    </header>
  );
}
