
import { useTasks } from '../hooks/useTasks';

export default function TaskManager() {
  const { tasks, isLoading, error, controlTask, exportTaskCSV } = useTasks();

  const handleControlTask = async (id, action) => {
    try {
      await controlTask(id, action);
    } catch (err) {
      alert(`Task control failed: ${err.message}`);
    }
  };

  const handleExport = async (task) => {
    try {
      await exportTaskCSV(task);
    } catch (err) {
      alert(err.message || 'Export failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center font-mono">
        <div className="w-8 h-8 border-2 border-t-blue-500 border-slate-800 rounded-full animate-spin mb-3"></div>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase">Syncing Task Matrix...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-2xl font-mono text-xs text-rose-400 flex items-start gap-3">
        <span className="material-symbols-outlined text-lg">dangerous</span>
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Queue Extraction Error</p>
          <p className="opacity-90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-[fadeIn_0.4s_ease-out]">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-slate-400 mt-1">Current and recently completed scraper jobs.</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="px-2.5 py-1 bg-blue-950/30 border border-blue-900/30 text-blue-400 rounded-lg">
            {tasks.filter(t => t.status === 'Running').length} Running
          </span>
          <span className="px-2.5 py-1 bg-amber-950/30 border border-amber-900/30 text-amber-400 rounded-lg">
            {tasks.filter(t => t.status === 'Queued').length} Queued
          </span>
          <span className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 rounded-lg">
            {tasks.filter(t => t.status === 'Completed').length} Done
          </span>
          <span className="px-2.5 py-1 bg-rose-950/30 border border-rose-900/30 text-rose-400 rounded-lg">
            {tasks.filter(t => t.status === 'Failed').length} Failed
          </span>
        </div>
      </div>

      {/* Task Cards */}
      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
          <div className="glass-panel text-center p-8 border border-slate-900 rounded-2xl text-xs font-mono text-slate-500 italic">
            No jobs in queue. Run a scrape from Scrapper Config to populate the task matrix.
          </div>
        ) : (
          tasks.map((task) => {
            const progress = task.progress ?? (task.status === 'Completed' ? 100 : 0);

            return (
              <div
                key={task.id}
                className="glass-panel border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-blue-400 px-2.5 py-1 rounded-lg">
                      {task.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-200 truncate font-mono max-w-xs md:max-w-md">
                      {task.target}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      task.status === 'Running'   ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' :
                      task.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' :
                      task.status === 'Queued'    ? 'bg-amber-950/40 text-amber-400 border-amber-900/40' :
                      task.status === 'Failed'    ? 'bg-rose-950/40 text-rose-400 border-rose-900/40' :
                      'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>Job progress</span>
                    <span className="font-mono text-slate-300">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-900 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        task.status === 'Completed' ? 'bg-emerald-500' :
                        task.status === 'Failed'    ? 'bg-rose-500' :
                        task.status === 'Queued'    ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Fail reason */}
                {task.failReason && (
                  <p className="text-[10px] text-rose-400 font-mono bg-rose-950/20 border border-rose-900/30 rounded-lg px-3 py-1.5">
                    ❌ {task.failReason}
                  </p>
                )}

                {/* Timestamps */}
                <div className="flex gap-4 text-[10px] text-slate-600 font-mono">
                  {task.addedAt && <span>Added: {new Date(task.addedAt).toLocaleTimeString()}</span>}
                  {task.finishedAt && <span>Finished: {new Date(task.finishedAt).toLocaleTimeString()}</span>}
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-900 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {task.engine}{task.location ? ` · ${task.location}` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {task.status === 'Queued' && (
                      <button onClick={() => handleControlTask(task.id, 'kill')}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 transition-colors cursor-pointer flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">close</span> Terminate
                      </button>
                    )}
                    {task.status === 'Failed' && (
                      <button onClick={() => handleControlTask(task.id, 'retry')}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-blue-900/40 transition-colors cursor-pointer flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">refresh</span> Retry
                      </button>
                    )}
                    {task.status === 'Completed' && (
                      <button onClick={() => handleExport(task)}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/20 border border-blue-900/30 text-blue-400 hover:bg-blue-950/40 transition-colors cursor-pointer flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">download</span> Export CSV
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
