import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Star,
  Flame,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { Task } from '../utils/logic';
import { soundEngine } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';

interface TaskPlannerProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}

const MICRO_SUGGESTIONS = [
  'Write 1 messy sentence',
  'Open folder & read page 1',
  'Brainstorm 3 bullet ideas',
  'Draft email subject & opening',
  'Clear desktop of clutter',
];

export const TaskPlanner: React.FC<TaskPlannerProps> = ({
  tasks,
  setTasks,
  activeTaskId,
  setActiveTaskId,
}) => {
  const [inputText, setInputText] = useState('');
  const [estimatedPomos, setEstimatedPomos] = useState(1);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text,
      done: false,
      isPriority: tasks.length === 0,
      pomodorosEstimated: estimatedPomos,
      pomodorosCompleted: 0,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);
    if (!activeTaskId || tasks.length === 0) {
      setActiveTaskId(newTask.id);
    }
    setInputText('');
  };

  const handleToggleTask = (task: Task, e: React.MouseEvent) => {
    const isNowDone = !task.done;
    if (isNowDone) {
      soundEngine.playTaskSuccess();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: isNowDone } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) {
      const remaining = tasks.filter((t) => t.id !== id && !t.done);
      setActiveTaskId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSelectActive = (id: string) => {
    setActiveTaskId(activeTaskId === id ? null : id);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="glass-panel p-6 flex flex-col h-full rounded-[24px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
              <ListTodo className="w-5 h-5 text-[#ff9f0a]" />
              Next Micro-Step
            </h2>
            {tasks.length > 0 && (
              <span className="text-xs text-[#8e8e93]">
                · <strong className="text-[#30d158]">{completedCount}</strong> of {tasks.length} done
              </span>
            )}
          </div>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            Break giants into bite-sized, 5-minute micro actions.
          </p>
        </div>
      </div>

      {/* Input row */}
      <form onSubmit={handleAddTask} className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. Open slide 3 and write the summary"
            maxLength={120}
            className="flex-1 bg-[#1c1c1e] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8e8e93] focus:outline-none focus:border-[#ff9f0a] transition-all"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#ff9f0a] hover:bg-[#ffb340] text-black font-semibold text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-[#ff9f0a]/20"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Micro suggestion chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[#8e8e93] flex items-center gap-1 shrink-0 font-medium">
            Quick steps:
          </span>
          {MICRO_SUGGESTIONS.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputText(sug)}
              className="shrink-0 px-2.5 py-1 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/10 text-[#8e8e93] hover:text-white transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>
      </form>

      {/* iOS Segmented Filter tabs */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs">
          <div className="ios-segmented flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                filter === 'all' ? 'bg-[#ff9f0a] text-black font-semibold shadow-sm' : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                filter === 'active' ? 'bg-[#ff9f0a] text-black font-semibold shadow-sm' : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              Active ({tasks.length - completedCount})
            </button>
            <button
              onClick={() => setFilter('done')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                filter === 'done' ? 'bg-[#ff9f0a] text-black font-semibold shadow-sm' : 'text-[#8e8e93] hover:text-white'
              }`}
            >
              Done ({completedCount})
            </button>
          </div>

          {completedCount > 0 && (
            <button
              onClick={() => setTasks((prev) => prev.filter((t) => !t.done))}
              className="text-[#ff453a] hover:underline text-[11px] font-medium"
            >
              Clear completed
            </button>
          )}
        </div>
      )}

      {/* Task list container */}
      <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#8e8e93] border border-dashed border-white/10 rounded-2xl bg-[#1c1c1e]/40">
            <p className="font-semibold text-white mb-1">Starting is the hardest hurdle.</p>
            <p className="max-w-xs mx-auto text-[#8e8e93]">
              Write one tiny, specific action above. Once you complete it, momentum will take care of the rest!
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isActive = activeTaskId === task.id;
            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  task.done
                    ? 'bg-[#1c1c1e]/40 border-white/5 opacity-50'
                    : isActive
                    ? 'bg-[#1c1c1e] border-[#ff9f0a]/50 shadow-sm'
                    : 'bg-[#1c1c1e]/80 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={(e) => handleToggleTask(task, e)}
                    aria-label={task.done ? `Mark "${task.text}" as incomplete` : `Mark "${task.text}" as complete`}
                    className="text-[#30d158] shrink-0 hover:scale-105 transition-transform"
                  >
                    {task.done ? (
                      <CheckCircle2 className="w-5 h-5 fill-[#30d158] text-black" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#8e8e93] hover:text-[#ff9f0a]" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm block break-words ${
                        task.done ? 'line-through text-[#8e8e93]' : 'text-white'
                      }`}
                    >
                      {task.text}
                    </span>
                    {isActive && !task.done && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#ff9f0a] font-semibold mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a] animate-pulse" />
                        Active on Timer
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  {!task.done && (
                    <button
                      onClick={() => handleSelectActive(task.id)}
                      aria-label={isActive ? 'Unpin from timer HUD' : 'Pin to timer HUD'}
                      className={`p-1.5 rounded-xl border transition-all active:scale-95 ${
                        isActive
                          ? 'border-[#ff9f0a]/50 bg-[#ff9f0a]/20 text-[#ff9f0a]'
                          : 'border-white/10 hover:border-white/20 text-[#8e8e93] hover:text-white'
                      }`}
                      title={isActive ? 'Active Task on Timer' : 'Pin as Active Task'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isActive ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    aria-label={`Delete task ${task.text}`}
                    className="p-1.5 rounded-xl border border-white/10 hover:border-red-400/40 text-[#8e8e93] hover:text-[#ff453a] transition-all active:scale-95"
                    title="Remove task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
