import { CalendarDays, ClipboardList, Plus, Trash2, UserRound, X } from 'lucide-react';
import { Field } from './FormField';

function DialogFrame({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className="modal-icon"><ClipboardList size={19} /></div><h2>{title}</h2><p className="modal-subtitle">{subtitle}</p>{children}</section>
    </div>
  );
}

export function CreateTaskDialog({ onClose, onSubmit }) {
  return <DialogFrame title="Create a task" subtitle="Add a clear next step to your list." onClose={onClose}>
    <form className="form" onSubmit={onSubmit}>
      <Field label="Task title" name="title" placeholder="What needs to get done?" required />
      <label className="field"><span>Description <em>Optional</em></span><textarea name="description" rows="3" placeholder="Add a little context…" /></label>
      <div className="form-row"><label className="field"><span>Status</span><select name="status"><option value="pending">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label><Field label="Due date" name="due_date" type="date" /></div>
      <Field label="Assign to user ID" name="user_id" type="number" placeholder="Leave blank to assign to yourself" />
      <button className="primary-btn form-submit"><Plus size={16} />Create task</button>
    </form>
  </DialogFrame>;
}

export function TaskDetailsDialog({ task, isAdmin, onClose, onStatusChange, onDelete }) {
  const dueDate = task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No due date';
  return <DialogFrame title="Task details" subtitle="Review or update this task." onClose={onClose}>
    <div className="detail-card"><span className={`status-badge ${task.status}`}><i />{task.status.replace('_', ' ')}</span><h3>{task.title}</h3><p>{task.description || 'No description provided.'}</p>
      <div className="detail-meta"><span><CalendarDays size={15} />{dueDate}</span><span><UserRound size={15} />{task.user?.name || `User ${task.user_id || '—'}`}</span></div>
      <div className="detail-actions"><label className="field"><span>Status</span><select value={task.status} onChange={(event) => onStatusChange(task, event.target.value)}><option value="pending">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>{isAdmin && <button className="danger-btn" onClick={() => onDelete(task)}><Trash2 size={15} />Delete task</button>}</div>
    </div>
  </DialogFrame>;
}
