import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Check, CheckCheck, Circle, LayoutGrid, LogOut, Plus } from 'lucide-react';
import { useNavigate } from '../hooks/useNavigate';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TaskList from '../components/TaskList';
import { CreateTaskDialog, TaskDetailsDialog } from '../components/TaskDialog';

export default function DashboardPage() {
  const { token, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, perPage: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');
  const isAdmin = user?.role === 'admin';

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const statusQuery = filter === 'all' ? '' : `&status=${filter}`;
      const response = await apiRequest(`/tasks?page=${page}&per_page=${pagination.perPage}${statusQuery}`, { token });
      setTasks(Array.isArray(response) ? response : response?.data || []);
      if (response?.meta) {
        setPagination({
          currentPage: response.meta.current_page,
          lastPage: response.meta.last_page,
          perPage: response.meta.per_page,
          total: response.meta.total,
        });
      } else {
        const total = Array.isArray(response) ? response.length : response?.data?.length || 0;
        setPagination({ currentPage: 1, lastPage: 1, perPage: total || pagination.perPage, total });
      }
      setError('');
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [filter, page, token]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => {
    if (page > pagination.lastPage) setPage(Math.max(1, pagination.lastPage));
  }, [page, pagination.lastPage]);
  const counts = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  async function createTask(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!values.due_date) delete values.due_date;
    if (!values.user_id) delete values.user_id;
    else values.user_id = Number(values.user_id);
    try { await apiRequest('/tasks', { token, method: 'POST', body: JSON.stringify(values) }); setDialog(null); setNotice('Task created'); await loadTasks(); }
    catch (requestError) { setError(requestError.message); }
  }

  async function updateTask(task, updates) {
    try { await apiRequest(`/tasks/${task.id}`, { token, method: 'PATCH', body: JSON.stringify(updates) }); setDialog(null); setNotice('Task updated'); await loadTasks(); }
    catch (requestError) { setError(requestError.message); }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    try { await apiRequest(`/tasks/${task.id}`, { token, method: 'DELETE' }); setDialog(null); setNotice('Task deleted'); await loadTasks(); }
    catch (requestError) { setError(requestError.message); }
  }

  async function handleSignOut() { await signOut(); navigate('/login', { replace: true }); }
  const statusOptions = [
    { id: 'all', label: 'My tasks', icon: <LayoutGrid size={17} /> },
    { id: 'pending', label: 'To do', icon: <Circle size={17} /> },
    { id: 'in_progress', label: 'In progress', icon: <Activity size={17} /> },
    { id: 'completed', label: 'Completed', icon: <Check size={17} /> },
  ];

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-icon"><CheckCheck size={18} /></div><span>To-Do</span></div>
      <div className="workspace"><div className="workspace-avatar">T</div><div className="workspace-copy"><strong>To-Do workspace</strong><small>Personal plan</small></div></div>
      <div className="side-label">WORKSPACE</div><nav className="nav-group">{statusOptions.map((item) => <button key={item.id} className={`nav-item ${filter === item.id ? 'active' : ''}`} onClick={() => { setFilter(item.id); setPage(1); }}>{item.icon}<span>{item.label}</span><span className="nav-count">{item.id === 'all' ? pagination.total : counts[item.id]}</span></button>)}</nav>
      <div className="sidebar-spacer" />{isAdmin && <button className="nav-item" onClick={() => setDialog({ type: 'create' })}><Plus size={17} /><span>New task</span></button>}
      <button className="nav-item help-link" onClick={handleSignOut}><LogOut size={17} /><span>Sign out</span></button>
      <div className="sidebar-user"><div className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div><div className="user-copy"><strong>{user?.name}</strong><small>{user?.email}</small></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>My tasks</strong></div><div className="today-pill"><CalendarDays size={15} />{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div></header>
      <section className="content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR DAY, IN FOCUS</div><h1>My tasks<span className="heading-period">.</span></h1><p className="page-subtitle">A clear mind starts with a clear plan.</p></div>{isAdmin && <button className="primary-btn" onClick={() => setDialog({ type: 'create' })}><Plus size={17} />New task</button>}</div>
        {error && <div className="error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
        <div className="stats-grid"><StatCard label="All tasks" count={counts.all} color="violet" icon={<LayoutGrid size={17} />} /><StatCard label="To do" count={counts.pending} color="amber" icon={<Circle size={17} />} /><StatCard label="In progress" count={counts.in_progress} color="blue" icon={<Activity size={17} />} /><StatCard label="Completed" count={counts.completed} color="green" icon={<Check size={17} />} /></div>
        <TaskList tasks={tasks} loading={loading} query={query} onQueryChange={setQuery} onOpen={(task) => setDialog({ type: 'details', task })} onToggle={(task) => updateTask(task, { status: task.status === 'completed' ? 'pending' : 'completed' })} onCreate={isAdmin ? () => setDialog({ type: 'create' }) : null} pagination={pagination} onPageChange={setPage} />
        <footer className="footer"><span>Made for doing good work, at your own pace.</span><span><i className="footer-dot" /> ALL SYSTEMS CONNECTED</span></footer>
      </section>
    </main>
    {dialog?.type === 'create' && <CreateTaskDialog onClose={() => setDialog(null)} onSubmit={createTask} />}
    {dialog?.type === 'details' && <TaskDetailsDialog task={dialog.task} isAdmin={isAdmin} onClose={() => setDialog(null)} onStatusChange={(task, status) => updateTask(task, { status })} onDelete={deleteTask} />}
    {notice && <div className="toast">{notice}<button onClick={() => setNotice('')}>×</button></div>}
  </div>;
}

function StatCard({ label, count, color, icon }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div className="stat-text"><span>{label}</span><strong>{count}</strong><small>In your workspace</small></div><div className={`stat-spark ${color}`} /></div>;
}
