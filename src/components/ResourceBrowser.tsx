import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Phone, Globe, X, Filter, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  tags: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  treatment_facility: 'Treatment Facility',
  aa_meeting: 'AA Meeting',
  buprenorphine_prescriber: 'Buprenorphine Prescriber',
  counseling: 'Counseling',
  medical: 'Medical',
  shelter: 'Shelter',
  food: 'Food Assistance',
  crisis: 'Crisis Services',
  legal: 'Legal',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  treatment_facility: 'bg-emerald-100 text-emerald-800',
  aa_meeting: 'bg-blue-100 text-blue-800',
  buprenorphine_prescriber: 'bg-violet-100 text-violet-800',
  counseling: 'bg-pink-100 text-pink-800',
  medical: 'bg-purple-100 text-purple-800',
  shelter: 'bg-amber-100 text-amber-800',
  food: 'bg-yellow-100 text-yellow-800',
  crisis: 'bg-red-100 text-red-800',
  legal: 'bg-indigo-100 text-indigo-800',
  other: 'bg-slate-100 text-slate-800',
};

export default function ResourceBrowser() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchResources();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedCity]);

  const loadFilterOptions = async () => {
    // Get distinct categories
    const { data: catData } = await supabase
      .from('knowledge_base')
      .select('category')
      .eq('is_active', true);

    if (catData) {
      const uniqueCats = [...new Set(catData.map(r => r.category))].sort();
      setCategories(uniqueCats);
    }

    // Get distinct cities
    const { data: cityData } = await supabase
      .from('knowledge_base')
      .select('city')
      .eq('is_active', true)
      .not('city', 'is', null);

    if (cityData) {
      const uniqueCities = [...new Set(cityData.map(r => r.city).filter(Boolean))] as string[];
      uniqueCities.sort();
      setCities(uniqueCities);
    }
  };

  const searchResources = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('knowledge_base')
      .select('id, title, content, category, city, state, zip_code, phone, website, tags')
      .eq('is_active', true)
      .order('title', { ascending: true })
      .limit(50);

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    if (selectedCity !== 'all') {
      query = query.eq('city', selectedCity);
    }

    if (searchQuery.trim()) {
      query = query.textSearch('fts', searchQuery.trim(), { type: 'websearch' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Search error:', error);
      // Fallback: try ilike search if full-text fails
      if (searchQuery.trim()) {
        let fallback = supabase
          .from('knowledge_base')
          .select('id, title, content, category, city, state, zip_code, phone, website, tags')
          .eq('is_active', true)
          .or(`title.ilike.%${searchQuery.trim()}%,content.ilike.%${searchQuery.trim()}%,city.ilike.%${searchQuery.trim()}%`)
          .order('title', { ascending: true })
          .limit(50);

        if (selectedCategory !== 'all') {
          fallback = fallback.eq('category', selectedCategory);
        }
        if (selectedCity !== 'all') {
          fallback = fallback.eq('city', selectedCity);
        }

        const { data: fallbackData } = await fallback;
        setEntries(fallbackData || []);
        setTotalCount(fallbackData?.length || 0);
      } else {
        setEntries([]);
        setTotalCount(0);
      }
    } else {
      setEntries(data || []);
      setTotalCount(data?.length || 0);
    }

    setLoading(false);
  }, [searchQuery, selectedCategory, selectedCity]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCity('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedCity !== 'all';

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources by name, service, or location..."
            className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="px-3 sm:px-4 py-2 text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
        {loading ? 'Searching...' : `${totalCount} resource${totalCount !== 1 ? 's' : ''} found`}
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No resources found</p>
            <p className="text-slate-400 text-xs mt-1">
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Resources will appear here once loaded into the system'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full text-left px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-slate-900 text-sm leading-snug">{entry.title}</h3>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}`}>
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                      </div>

                      {entry.city && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {entry.city}{entry.state ? `, ${entry.state}` : ''}{entry.zip_code ? ` ${entry.zip_code}` : ''}
                        </p>
                      )}

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {entry.content}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {entry.phone && (
                              <a
                                href={`tel:${entry.phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                {entry.phone}
                              </a>
                            )}
                            {entry.website && (
                              <a
                                href={entry.website.startsWith('http') ? entry.website : `https://${entry.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                              >
                                <Globe className="w-3 h-3" />
                                Website
                              </a>
                            )}
                          </div>

                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {entry.tags.slice(0, 8).map((tag) => (
                                <span
                                  key={tag}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery(tag);
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] cursor-pointer hover:bg-slate-200 transition-colors"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
