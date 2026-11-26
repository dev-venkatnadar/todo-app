import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList, MoreHorizontal } from 'lucide-react';

const labels = { pending: 'To do', in_progress: 'In progress', completed: 'Completed' };
const dueDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date';

function TaskRow({ task, onOpen, onToggle }) {
  return (
    <div className="task-row">
      <button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => onToggle(task)} aria-label="Toggle task complete">
        {task.status === 'completed' && <Check size={13} />}
      </button>
      <button className="task-main" onClick={() => onOpen(task)}>
        <strong className={task.status === 'completed' ? 'done' : ''}>{task.title}</strong>
        <span>{task.description || 'No description'}</span>
      </button>
      <span className={`status-badge ${task.status}`}><i />{labels[task.status] || task.status}</span>
      <span className="due-date"><CalendarDays size={14} />{dueDate(task.due_date)}</span>
      <span className="assignee"><span className="avatar assignee-avatar">{(task.user?.name || 'U').charAt(0).toUpperCase()}</span>{task.user?.name || `User ${task.user_id || '—'}`}</span>
      <button className="row-more" onClick={() => onOpen(task)} aria-label="Open task"><MoreHorizontal size={18} /></button>
    </div>
  );
}

export default function TaskList({ tasks, loading, query, onQueryChange, onOpen, onToggle, onCreate, pagination, onPageChange }) {
  const filteredTasks = tasks.filter((task) => `${task.title} ${task.description || ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="tasks-panel">
      <div className="panel-heading">
        <div><h2>Your task list</h2><p>Everything you’re working on</p></div>
        <div className="panel-tools"><label className="search-box"><input placeholder="Search tasks..." value={query} onChange={(event) => onQueryChange(event.target.value)} /></label></div>
      </div>
      <div className="table-head"><span>TASK</span><span>STATUS</span><span>DUE DATE</span><span>ASSIGNEE</span><span /></div>
      {loading ? <div className="loading-state"><span className="loader" />Loading your tasks…</div> : filteredTasks.length ? (
        <div className="task-list">{filteredTasks.map((task) => <TaskRow key={task.id} task={task} onOpen={onOpen} onToggle={onToggle} />)}</div>
      ) : (
        <div className="empty-state"><div className="empty-art"><ClipboardList size={25} /></div><h3>{query ? 'No tasks found' : 'A fresh start'}</h3><p>{query ? 'Try a different search.' : 'Nothing on your list right now.'}</p>{onCreate && <button className="text-btn" onClick={onCreate}>Create a task</button>}</div>
      )}
      {!loading && pagination.total > 0 && <div className="pagination"><span>Showing <strong>{(pagination.currentPage - 1) * pagination.perPage + 1}–{Math.min(pagination.currentPage * pagination.perPage, pagination.total)}</strong> of <strong>{pagination.total}</strong> tasks</span><div><button disabled={pagination.currentPage <= 1} onClick={() => onPageChange(pagination.currentPage - 1)}><ArrowLeft size={14} />Previous</button><button disabled={pagination.currentPage >= pagination.lastPage} onClick={() => onPageChange(pagination.currentPage + 1)}>Next<ArrowRight size={14} /></button></div></div>}
    </section>
  );
}
