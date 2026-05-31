import React, { useState, useEffect } from 'react';
import { useScrappers } from '../hooks/useScrappers';

export default function ScrapperConfig() {
  const {
    isLoading,
    error,
    results,
    newsFeed,
    currentEngine,
    setCurrentEngine,
    runAmazonScraper,
    runIndeedScraper,
    runBookingScraper,
    fetchNewsFeed,
    setResults
  } = useScrappers();

  const [activeTab, setActiveTab] = useState('amazon');
  const [newsCategory, setNewsCategory] = useState('osint');

  const [amazonQuery, setAmazonQuery] = useState('');
  const [indeedRole, setIndeedRole] = useState('');
  const [indeedLocation, setIndeedLocation] = useState('');
  const [bookingDest, setBookingDest] = useState('');
  const [bookingIn, setBookingIn] = useState('');
  const [bookingOut, setBookingOut] = useState('');

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNewsFeed(newsCategory);
    } else {
      setResults([]);
    }
  }, [activeTab, newsCategory]);

  const handleExecuteScrape = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'amazon') {
        await runAmazonScraper(amazonQuery);
      } else if (activeTab === 'indeed') {
        await runIndeedScraper(indeedRole, indeedLocation);
      } else if (activeTab === 'booking') {
        await runBookingScraper(bookingDest, bookingIn, bookingOut);
      }
    } catch (err) {
      console.warn("Active worker pipeline reported an execution break.");
    }
  };

  const getItemUrl = (item) => {
    if (activeTab === 'amazon') return item.productUrl || '#';
    if (activeTab === 'indeed') return item.jobUrl || '#';
    if (activeTab === 'booking') return item.hotelUrl || '#';
    return '#';
  };

  const getItemTitle = (item) => {
    if (activeTab === 'booking') return item.hotelName || '—';
    return item.title || '—';
  };

  return (
    <div className="space-y-6 mx-auto p-4 md:p-6 font-mono text-xs">

      {/* Top Tab Controller */}
      <div className="flex border-b border-slate-900 gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'amazon', label: 'Amazon Core', icon: 'shopping_bag' },
          { id: 'indeed', label: 'Indeed Jobs', icon: 'work' },
          { id: 'booking', label: 'Booking Travel', icon: 'hotel' },
          { id: 'news', label: 'Live Intel Feeds', icon: 'rss_feed' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentEngine(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 border-t-2 uppercase font-bold tracking-wider text-[11px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-950/20 border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Card */}
      {activeTab !== 'news' ? (
        <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-white font-bold uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">terminal</span>
            Target Specification Parameters
          </h3>

          <form onSubmit={handleExecuteScrape} className="space-y-4">
            {activeTab === 'amazon' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase tracking-widest text-[10px]">Search Index Phrase *</label>
                <input
                  type="text"
                  value={amazonQuery}
                  onChange={(e) => setAmazonQuery(e.target.value)}
                  placeholder="e.g. distributed systems engineering"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                  required
                />
              </div>
            )}

            {activeTab === 'indeed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 uppercase tracking-widest text-[10px]">Target Specialization / Role *</label>
                  <input
                    type="text"
                    value={indeedRole}
                    onChange={(e) => setIndeedRole(e.target.value)}
                    placeholder="e.g. Backend Developer"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 uppercase tracking-widest text-[10px]">Geographic Location Zone *</label>
                  <select
                    value={indeedLocation}
                    onChange={(e) => setIndeedLocation(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono appearance-none"
                    required
                  >
                    <option value="" disabled className="text-slate-600">-- Select Work Environment Mode --</option>
                    <option value="remote" className="text-white">Remote / Work from Anywhere</option>
                    <option value="onsite" className="text-white">On-site (Office Location)</option>
                    <option value="hybrid" className="text-white">Hybrid Matrix Mode</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'booking' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 uppercase tracking-widest text-[10px]">Destination Area *</label>
                  <input
                    type="text"
                    value={bookingDest}
                    onChange={(e) => setBookingDest(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 uppercase tracking-widest text-[10px]">Check-In Date (YYYY-MM-DD) *</label>
                  <input
                    type="text"
                    value={bookingIn}
                    onChange={(e) => setBookingIn(e.target.value)}
                    placeholder="2026-07-10"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 uppercase tracking-widest text-[10px]">Check-Out Date (YYYY-MM-DD) *</label>
                  <input
                    type="text"
                    value={bookingOut}
                    onChange={(e) => setBookingOut(e.target.value)}
                    placeholder="2026-07-17"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-400 text-[11px] flex gap-2 items-center">
                <span className="material-symbols-outlined text-sm">error</span>
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-[#0b141c] font-bold py-2.5 rounded-xl transition-all tracking-wider uppercase disabled:opacity-40 disabled:cursor-wait cursor-pointer text-center"
            >
              {isLoading ? 'Assembling Headless Matrix Context...' : `Deploy ${activeTab} Core Engine`}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-white font-bold uppercase tracking-wider text-xs">Intelligence Classification Frame:</span>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'osint', label: 'OSINT Alerts' },
              { id: 'tech', label: 'Tech Crunch' },
              { id: 'crypto', label: 'Crypto Assets' },
              { id: 'international', label: 'Global Feed' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setNewsCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-bold tracking-wide border uppercase text-[10px] cursor-pointer transition-all ${
                  newsCategory === cat.id
                    ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Output Feed */}
      <div className="bg-[#0d1117] border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-white font-bold uppercase tracking-wide text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">database</span>
          {activeTab === 'news'
            ? `Live Aggregated Feed: ${newsCategory}`
            : `${activeTab} Local Database Cache Frame`}
        </h3>

        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500">
            {activeTab === 'news' ? (
              <div className="w-6 h-6 border-2 border-t-emerald-500 border-slate-800 rounded-full animate-spin mb-2"></div>
            ) : (
              <div className="w-6 h-6 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-2"></div>
            )}
            <p className="tracking-widest uppercase text-[10px]">
              {activeTab === 'news'
                ? 'Querying Production Aggregation Pipes...'
                : 'Deploying Headless Scraper Engine...'}
            </p>
          </div>

        ) : activeTab !== 'news' ? (
          results.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-2xl mb-1 opacity-30">inventory_2</span>
              <p className="uppercase tracking-widest text-[10px]">No telemetry nodes mapped in localized view state.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-900 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Title Attribute Node</th>
                    <th className="p-3">Identity / Metadata Context</th>
                    <th className="p-3">Value / Yield Metrics</th>
                    <th className="p-3 text-right">Gateway Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {results.map((item, idx) => (
                    <tr key={item._id || idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-medium text-white max-w-sm truncate">
                        {getItemTitle(item)}
                      </td>
                      <td className="p-3 text-slate-400 font-sans">
                        {activeTab === 'amazon' && `By: ${item.authors?.join(', ') || 'Unknown Entity'}`}
                        {activeTab === 'indeed' && `${item.company || 'N/A'} — ${item.location || 'Unspecified'}`}
                        {activeTab === 'booking' && `${item.location || 'Unspecified'}`}
                      </td>
                      <td className="p-3 text-blue-400 font-mono">
                        {activeTab === 'amazon' && `Price: $${item.price ?? 'N/A'} | Rating: ★${item.rating ?? 0}`}
                        {activeTab === 'indeed' && `Salary: ${item.salaryInfo || 'Undisclosed'}`}
                        {activeTab === 'booking' && `Rate: ${item.priceText || 'N/A'} | Score: ${item.rating ?? 0}`}
                      </td>
                      <td className="p-3 text-right">
                        <a href={getItemUrl(item)} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1 bg-emerald-950/20 px-2.5 py-1 rounded-md border border-emerald-900/30 text-[10px] font-bold uppercase tracking-wide">
                          Launch Node <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

        ) : (
          newsFeed.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-2xl mb-1 opacity-30">rss_feed</span>
              <p className="uppercase tracking-widest text-[10px]">Background processor queue is empty. Run master pipeline sync.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsFeed.map((post) => (
                <div
                  key={post._id}
                  className="bg-slate-950 border border-slate-900 rounded-xl p-4 hover:border-slate-800 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-500 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                        {post.sourceName}
                      </span>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-white font-bold text-xs leading-snug line-clamp-2 hover:text-blue-400 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-slate-400 font-sans text-[11px] leading-relaxed line-clamp-3">
                      {post.contentSummary || "No detailed validation text payload parsed."}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-900/60 flex justify-end">
                    <a href={post.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-bold uppercase text-[10px] flex items-center gap-1">
                      Read Intelligence Feed <span className="material-symbols-outlined text-xs">arrow_right_alt</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
