import Link from "next/link";
import { listKalam, listArtists } from "@/lib/data";
import { KalamCard } from "@/components/kalam-card";
import { HomeBanner } from "@/components/home-banner";
import { FeaturedKalam } from "@/components/featured-kalam";
import { Icon } from "@/components/icon";
export default async function Home() {
  const [{ items }, artists] = await Promise.all([listKalam(), listArtists()]);
  return (
    <>
      <HomeBanner />
      <FeaturedKalam items={items.slice(0, 5)} />
      <section className="home-section home-discover">
        <div className="content-width">
          <h2 className="section-label">
            EXPLORE SUKHAN <span>Read. Listen. Discover.</span>
          </h2>
          <div className="discovery-grid">
            <Link
              href="/catalogue?form=ghazal"
              className="discovery-card discovery-ghazal"
            >
              <div>
                <span lang="ur" dir="rtl">
                  غزل
                </span>
                <Icon name="book" size={30} />
              </div>
              <h3>Ghazals</h3>
              <p>A world in every couplet</p>
            </Link>
            <Link
              href="/catalogue?form=nazm"
              className="discovery-card discovery-nazm"
            >
              <div>
                <span lang="ur" dir="rtl">
                  نظم
                </span>
                <Icon name="read" size={30} />
              </div>
              <h3>Nazms</h3>
              <p>Poetry, without boundaries</p>
            </Link>
            <Link href="/media" className="discovery-card discovery-voices">
              <div>
                <span lang="ur" dir="rtl">
                  آواز
                </span>
                <Icon name="headphones" size={30} />
              </div>
              <h3>Voices & performances</h3>
              <p>Words, brought to life</p>
            </Link>
          </div>
        </div>
      </section>
      <section className="home-word">
        <div className="content-width">
          <h2 className="section-label">A WORD TO KEEP</h2>
          <p className="word-roman">sukhan</p>
          <p className="word-scripts">
            <span lang="ur" dir="rtl">
              سخن
            </span>
            <span>speech · words · poetry</span>
          </p>
          <p className="word-meaning">
            The art of putting a feeling into words.
          </p>
          <Link className="pink-link" href="/catalogue">
            Find your next favourite verse <Icon name="right" size={14} />
          </Link>
        </div>
      </section>
      <section className="home-section">
        <div className="content-width">
          <h2 className="section-label">POETS & ARTISTS</h2>
          <div className="home-artists">
            {artists.slice(0, 4).map((a) => (
              <Link
                href={`/artists/${a.slug}`}
                className="home-artist"
                key={a.id}
              >
                <span
                  className="artist-seal"
                  lang="ur"
                  dir="rtl"
                  aria-hidden="true"
                >
                  {a.name_ur || a.name[0]}
                </span>
                <h3>{a.name}</h3>
                <p>{a.kind === "both" ? "Poet & performing artist" : a.kind}</p>
              </Link>
            ))}
          </div>
          <p className="home-caption">
            Discover the people behind the words and the voices behind the
            verses.
          </p>
          <Link className="outline-link" href="/artists">
            View all poets & artists
          </Link>
        </div>
      </section>
      <section className="home-section home-library">
        <div className="content-width">
          <h2 className="section-label">THE SUKHAN LIBRARY</h2>
          <div className="card-grid">
            {items.slice(0, 3).map((k, i) => (
              <KalamCard key={k.id} kalam={k} index={i} />
            ))}
          </div>
          <Link className="outline-link" href="/catalogue">
            See the full collection
          </Link>
        </div>
      </section>
    </>
  );
}
