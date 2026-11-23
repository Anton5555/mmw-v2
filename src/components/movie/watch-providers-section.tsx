import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { watchCountryName } from '@/lib/watch-countries';
import type {
  MovieWatchProvidersView,
  WatchProviderKind,
} from '@/lib/api/watch-providers';

const KIND_LABELS: Record<WatchProviderKind, string> = {
  flatrate: 'Suscripción',
  free: 'Gratis',
  ads: 'Con anuncios',
  rent: 'Alquiler',
};

const KIND_ORDER: WatchProviderKind[] = ['flatrate', 'free', 'ads', 'rent'];

export function WatchProvidersSection({
  watchProviders,
}: {
  watchProviders: MovieWatchProvidersView;
}) {
  const { country, link, providers } = watchProviders;
  const groups = KIND_ORDER.filter((kind) => providers[kind].length > 0);

  return (
    <section className="space-y-3" aria-labelledby="watch-providers-title">
      <div className="flex items-center justify-between gap-3">
        <h3 id="watch-providers-title" className="text-lg font-bold">
          Dónde verla
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ReactCountryFlag
            countryCode={country}
            svg
            aria-hidden
            className="rounded-[2px] shadow-sm"
            style={{ width: '1.1rem', height: '0.8rem' }}
          />
          {watchCountryName(country)}
        </span>
      </div>

      {/* Groups sit side by side and wrap only when there is no room. */}
      <div className="flex flex-wrap gap-px overflow-hidden rounded-sm border border-border bg-border">
        {groups.map((kind) => (
          <div key={kind} className="min-w-36 flex-1 space-y-2.5 bg-card p-4">
            <h4 className="text-xs text-muted-foreground">{KIND_LABELS[kind]}</h4>
            <ul className="flex flex-wrap gap-2">
              {providers[kind].map((provider) => (
                <li key={provider.id}>
                  {provider.logoPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${provider.logoPath}`}
                      alt={provider.name}
                      title={provider.name}
                      width={40}
                      height={40}
                      className="size-10 rounded-md"
                    />
                  ) : (
                    <span className="flex h-10 items-center rounded-md border border-border px-2.5 text-xs">
                      {provider.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline-offset-2 hover:text-primary hover:underline"
          >
            Ver todas las opciones
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span />
        )}
        <span>Datos de JustWatch</span>
      </div>
    </section>
  );
}
