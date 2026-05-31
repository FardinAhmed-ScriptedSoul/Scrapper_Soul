import React from 'react';
import { useTasks } from '../hooks/useTasks';

export default function TaskManager() {
  const { tasks, isLoading, error, controlTask, deployTask } = useTasks();

  const handleControlTask = async (id, action) => {
    try {
      await controlTask(id, action);
    } catch (err) {
      alert(`Mainframe Core failed to execute worker thread control: ${err.message}`);
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
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-white">Active Extraction Tasks</h1>
          <p className="text-xs text-slate-400 mt-1">Monitor real-time payload progress, track chunk pipelines, and scale task jobs dynamically.</p>
        </div>
        <button 
          onClick={() => deployTask({ target: 'example.com', type: 'dynamic' })}
          className="bg-blue-500 hover:bg-blue-600 text-[#0b141c] text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Deploy New Task
        </button>
      </div>

      {/* Grid of Task Cards */}
      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
          <div className="glass-panel text-center p-8 border border-slate-900 rounded-2xl text-xs font-mono text-slate-500 italic">
            No active crawler tasks initialized in the queue partition.
          </div>
        ) : (
          tasks.map((task) => {
            const processed = task.processed ?? 0;
            const total = task.total ?? 100;
            const progressPercent = Math.min(Math.floor((processed / total) * 100), 100);
            
            return (
              <div 
                key={task.id || task._id} 
                className="glass-panel border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Header inside Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-blue-400 px-2.5 py-1 rounded-lg">
                      {task.id || 'TASK-NODE'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-200 truncate font-mono max-w-xs md:max-w-md">
                      {task.target}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
                    <span className="text-slate-500">Speed: <span className="text-slate-300">{task.speed || '0 req/s'}</span></span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      task.status === 'Running' ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' :
                      task.status === 'Completed' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' :
                      task.status === 'Paused' ? 'bg-amber-950/40 text-amber-400 border-amber-900/40' :
                      'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {task.status || 'Queued'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Metrics */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>Chunk Buffer Compilation</span>
                    <span className="font-mono text-slate-300">{processed.toLocaleString()} / {total.toLocaleString()} ({progressPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-900 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        task.status === 'Completed' ? 'bg-emerald-500' :
                        task.status === 'Paused' ? 'bg-amber-500' :
                        task.status === 'Terminated' ? 'bg-rose-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Interaction Controllers Footer */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-900 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">Worker Node Thread Matrix Verified</span>
                  
                  <div className="flex items-center gap-2">
                    {task.status === 'Running' && (
                      <button 
                        onClick={() => handleControlTask(task.id, 'pause')}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-900/40 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">pause</span> Pause
                      </button>
                    )}
                    {task.status === 'Paused' && (
                      <button 
                        onClick={() => handleControlTask(task.id, 'resume')}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-900/40 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">play_arrow</span> Resume
                      </button>
                    )}
                    {['Running', 'Paused', 'Queued'].includes(task.status) && (
                      <button 
                        onClick={() => handleControlTask(task.id, 'kill')}
                        className="px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">close</span> Terminate
                      </button>
                    )}
                    {task.status === 'Completed' && (
                      <button className="px-2.5 py-1 rounded-lg bg-blue-950/20 border border-blue-900/30 text-blue-400 hover:bg-blue-950/40 transition-colors cursor-pointer flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">download</span> Export Dataset
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