import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { GENRE_IDS, TMDB_COUNTRIES } from '../utils/api';
import { cn } from '@/lib/utils';

export default function BrowseSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('genre');

  const genreEntries = Object.entries(GENRE_IDS);

  return (
    <section className="space-y-4">
      <h2 className="text-white font-bold text-lg sm:text-xl">{t('browse.title')}</h2>

      <div className="flex gap-2 bg-white/10 rounded-full p-1 inline-flex">
        <button
          onClick={() => setActiveTab('genre')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition',
            activeTab === 'genre' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
          )}
        >
          {t('browse.genreTab')}
        </button>
        <button
          onClick={() => setActiveTab('country')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition',
            activeTab === 'country' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
          )}
        >
          {t('browse.countryTab')}
        </button>
      </div>

      {activeTab === 'genre' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {genreEntries.map(([key, id]) => (
            <button
              key={key}
              onClick={() => navigate(`/genre/${id}`)}
              className="bg-background-elevated hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-colors text-center"
            >
              <span className="text-white text-sm">{t(`genres.${key}`)}</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'country' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {TMDB_COUNTRIES.map((country) => (
            <button
              key={country.iso}
              onClick={() => navigate(`/country/${country.iso}`)}
              className="bg-background-elevated hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-colors text-center"
            >
              <span className="text-white text-sm">{country.flag} {t(`countries.${country.code}`)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
