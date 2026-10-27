import Link from "next/link";
import { Icon } from "./icon";
import { MenuLink } from "./menu-link";
const links = [
  { label: "POETS", href: "/artists" },
  { label: "KALAM", href: "/catalogue" },
  { label: "AUDIO", href: "/media?kind=audio" },
  { label: "VIDEOS", href: "/media?kind=video" },
];
function MoreLinks() {
  return (
    <>
      <MenuLink href="/catalogue?form=ghazal">Ghazals</MenuLink>
      <MenuLink href="/catalogue?form=nazm">Nazms</MenuLink>
      <MenuLink href="/catalogue?form=sher">Couplets</MenuLink>
      <MenuLink href="/artists">Poets & artists</MenuLink>
      <MenuLink href="/dictionary">Dictionary</MenuLink>
      <MenuLink href="/admin">Editorial studio</MenuLink>
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
          <details className="reading-menu">
            <summary
              className="header-locale"
              aria-label="Browse by reading script"
            >
              Read ▾
            </summary>
            <nav className="dropdown" aria-label="Reading scripts">
              <MenuLink href="/catalogue?lang=ur">اردو</MenuLink>
              <MenuLink href="/catalogue?lang=hi">हिन्दी</MenuLink>
              <MenuLink href="/catalogue?lang=roman">Roman Urdu</MenuLink>
              <MenuLink href="/catalogue?lang=fa">فارسی</MenuLink>
              <MenuLink href="/catalogue?lang=ar">العربية</MenuLink>
              <MenuLink href="/catalogue?lang=en">English</MenuLink>
            </nav>
          </details>
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
