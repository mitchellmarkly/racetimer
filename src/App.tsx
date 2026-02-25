import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Finish, RaceType, Runner } from './types';
import { loadData, saveData } from './repository';
import {
  defaultData,
  downloadCsv,
  exportResultsToCsv,
  formatElapsed,
  formatTimeOfDay,
  normalizeBib,
  parseBulkInput,
} from './utils';
import './styles.css';

type Tab = 'Start' | 'Runners' | 'Finish' | 'Results';

function App() {
  const [tab, setTab] = useState<Tab>('Finish');
  const [data, setData] = useState<AppData>(defaultData);
  const [now, setNow] = useState(Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData().then((loadedData) => {
      setData(loadedData);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void saveData(data);
  }, [data, loaded]);

  return (
    <div className="app-shell">
      <header className="top-nav">
        {(['Start', 'Runners', 'Finish', 'Results'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </header>
      <main className="content">
        {tab === 'Start' && <StartTab data={data} now={now} onChange={setData} />}
        {tab === 'Runners' && <RunnersTab data={data} onChange={setData} />}
        {tab === 'Finish' && <FinishTab data={data} onChange={setData} />}
        {tab === 'Results' && <ResultsTab data={data} onChange={setData} />}
      </main>
    </div>
  );
}

function StartTab({ data, now, onChange }: { data: AppData; now: number; onChange: (d: AppData) => void }) {
  const startRace = (race: RaceType) => {
    if (!window.confirm(`Start ${race} now?`)) return;
    onChange({ ...data, settings: { starts: { ...data.settings.starts, [race]: Date.now() } } });
  };

  return (
    <section className="stack">
      <h1>Race Starts</h1>
      <div className="grid-2">
        {(['10K', '5K'] as RaceType[]).map((race) => {
          const start = data.settings.starts[race];
          return (
            <div key={race} className="card">
              <h2>{race}</h2>
              <button className="big-btn" onClick={() => startRace(race)}>
                Start {race}
              </button>
              <div className="timer">{start ? formatElapsed(now - start) : 'Not started'}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RunnersTab({ data, onChange }: { data: AppData; onChange: (d: AppData) => void }) {
  const [bibNumber, setBibNumber] = useState('');
  const [race, setRace] = useState<RaceType>('5K');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bulkText, setBulkText] = useState('');

  const existingBibs = useMemo(() => new Set(data.runners.map((r) => r.bibNumber)), [data.runners]);
  const bulkPreview = useMemo(() => parseBulkInput(bulkText, existingBibs), [bulkText, existingBibs]);

  const addSingle = () => {
    const bib = normalizeBib(bibNumber);
    if (!bib) return;
    if (existingBibs.has(bib)) {
      alert('Duplicate bib number.');
      return;
    }

    const runner: Runner = { bibNumber: bib, race, firstName, lastName, createdAt: Date.now() };
    onChange({ ...data, runners: [...data.runners, runner] });
    setBibNumber('');
    setFirstName('');
    setLastName('');
  };

  const importBulk = () => {
    if (bulkPreview.parsed.length === 0) return;
    onChange({ ...data, runners: [...data.runners, ...bulkPreview.parsed] });
    setBulkText('');
  };

  return (
    <section className="stack">
      <h1>Runners</h1>
      <div className="card stack">
        <h2>Add Runner</h2>
        <input placeholder="Bib #" value={bibNumber} onChange={(e) => setBibNumber(e.target.value)} />
        <select value={race} onChange={(e) => setRace(e.target.value as RaceType)}>
          <option value="5K">5K</option>
          <option value="10K">10K</option>
        </select>
        <input placeholder="First name (optional)" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input placeholder="Last name (optional)" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <button className="big-btn" onClick={addSingle}>Add Runner</button>
      </div>

      <div className="card stack">
        <h2>Bulk Import</h2>
        <textarea
          rows={6}
          placeholder="One per line: BIB | BIB,5K | BIB,10K,First,Last | BIB First Last"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
        <div><strong>Preview:</strong> {bulkPreview.parsed.length} ready, {bulkPreview.errors.length} errors</div>
        {bulkPreview.errors.length > 0 && (
          <ul className="error-list">
            {bulkPreview.errors.map((error) => (
              <li key={`${error.line}-${error.message}`}>Line {error.line}: {error.message}</li>
            ))}
          </ul>
        )}
        <button className="big-btn" onClick={importBulk}>Import</button>
      </div>
    </section>
  );
}

function FinishTab({ data, onChange }: { data: AppData; onChange: (d: AppData) => void }) {
  const [bibInput, setBibInput] = useState('');
  const [warning, setWarning] = useState('');
  const [lastFinishBib, setLastFinishBib] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runner = useMemo(
    () => data.runners.find((r) => r.bibNumber === normalizeBib(bibInput)),
    [bibInput, data.runners]
  );

  const recordFinish = () => {
    setWarning('');
    const bib = normalizeBib(bibInput);
    if (!bib) return;

    const found = data.runners.find((r) => r.bibNumber === bib);
    if (!found) {
      setWarning('Runner not found. Add runner first.');
      return;
    }

    const raceStart = data.settings.starts[found.race];
    if (!raceStart) {
      setWarning(`${found.race} start not set. Go to Start tab first.`);
      return;
    }

    const existing = data.finishes.find((f) => f.bibNumber === bib);
    if (existing && !window.confirm(`${bib} already has a finish. Overwrite?`)) {
      return;
    }

    const now = Date.now();
    const nextFinish: Finish = {
      bibNumber: bib,
      race: found.race,
      finishTimestamp: now,
      elapsedMs: now - raceStart,
    };

    const remaining = data.finishes.filter((f) => f.bibNumber !== bib);
    onChange({ ...data, finishes: [...remaining, nextFinish] });
    setLastFinishBib(bib);
    setBibInput('');
    inputRef.current?.focus();
  };

  const undoLast = () => {
    if (!lastFinishBib) return;
    onChange({ ...data, finishes: data.finishes.filter((f) => f.bibNumber !== lastFinishBib) });
    setLastFinishBib(null);
  };

  return (
    <section className="stack">
      <h1>Finish Entry</h1>
      <div className="card stack sticky-box">
        <input
          ref={inputRef}
          className="finish-input"
          placeholder="Enter bib #"
          value={bibInput}
          onChange={(e) => setBibInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              recordFinish();
            }
          }}
        />
        <div className="match-box">
          {runner ? `${runner.bibNumber} • ${runner.firstName ?? ''} ${runner.lastName ?? ''} (${runner.race})` : 'No runner selected'}
        </div>
        {warning && <div className="warning">{warning}</div>}
        <button className="huge-btn" onClick={recordFinish}>Record Finish</button>
        <button className="big-btn secondary" onClick={undoLast} disabled={!lastFinishBib}>
          Undo last finish {lastFinishBib ? `(${lastFinishBib})` : ''}
        </button>
      </div>
    </section>
  );
}

function ResultsTab({ data, onChange }: { data: AppData; onChange: (d: AppData) => void }) {
  const [raceFilter, setRaceFilter] = useState<RaceType | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const byBib = new Map(data.runners.map((r) => [r.bibNumber, r]));
    const q = query.trim().toLowerCase();
    const filtered = data.finishes
      .filter((f) => (raceFilter === 'ALL' ? true : f.race === raceFilter))
      .map((finish) => ({ finish, runner: byBib.get(finish.bibNumber) }))
      .filter(({ finish, runner }) => {
        if (!q) return true;
        const name = `${runner?.firstName ?? ''} ${runner?.lastName ?? ''}`.toLowerCase();
        return finish.bibNumber.toLowerCase().includes(q) || name.includes(q);
      })
      .sort((a, b) => a.finish.elapsedMs - b.finish.elapsedMs);

    const placeCount: Record<RaceType, number> = { '5K': 0, '10K': 0 };
    return filtered.map((row) => {
      placeCount[row.finish.race] += 1;
      return { ...row, place: placeCount[row.finish.race] };
    });
  }, [data.finishes, data.runners, raceFilter, query]);

  const exportCsv = () => {
    const csv = exportResultsToCsv(data.runners, data.finishes, data.settings);
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    downloadCsv(`race-results-${stamp}.csv`, csv);
  };

  const clearAll = () => {
    if (!window.confirm('Clear all data? This cannot be undone.')) return;
    onChange(defaultData);
  };

  return (
    <section className="stack">
      <h1>Results</h1>
      <div className="card stack">
        <div className="controls-row">
          <select value={raceFilter} onChange={(e) => setRaceFilter(e.target.value as RaceType | 'ALL')}>
            <option value="ALL">All Races</option>
            <option value="5K">5K</option>
            <option value="10K">10K</option>
          </select>
          <input placeholder="Search bib/name" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={exportCsv}>Export CSV</button>
          <button className="danger" onClick={clearAll}>Clear all data</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Place</th>
                <th>Bib</th>
                <th>Name</th>
                <th>Race</th>
                <th>Finish Time</th>
                <th>Time of Day</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ finish, runner, place }) => (
                <tr key={finish.bibNumber}>
                  <td>{place}</td>
                  <td>{finish.bibNumber}</td>
                  <td>{`${runner?.firstName ?? ''} ${runner?.lastName ?? ''}`.trim() || '-'}</td>
                  <td>{finish.race}</td>
                  <td>{formatElapsed(finish.elapsedMs)}</td>
                  <td>{formatTimeOfDay(finish.finishTimestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default App;
