import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

interface Project {
  id: number;
  project_name?: string;
  progress?: number;
  total_tasks?: number;
  completed_tasks?: number;
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createBudget, setCreateBudget] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const panelType = user?.panel_type ?? 3;
  const isManagement = panelType === 1;
  const isTechnicalDirector = user?.user_role === 'Technical Director';
  const canCreate = isManagement;
  const canEdit = panelType !== 3;
  const canDelete = isManagement;
  const title = isManagement ? 'Projects' : 'Projects Involved';

  useEffect(() => {
    api
      .get<{ projects?: Project[] }>('/api/projects')
      .then(({ data }) => setList(data.projects ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!createName.trim()) {
      setCreateError('Project name is required.');
      return;
    }
    setCreateSubmitting(true);
    api
      .post<{ success: boolean; project_id?: number }>('/api/projects', {
        project_name: createName.trim(),
        budget: createBudget.trim() || undefined,
      })
      .then(({ data }) => {
        if (data.success && data.project_id) {
          setShowCreateModal(false);
          setCreateName('');
          setCreateBudget('');
          navigate(`/projects/${data.project_id}`);
          setList((prev) => [...prev, { id: data.project_id!, project_name: createName.trim(), progress: 0, total_tasks: 0, completed_tasks: 0 }]);
        }
      })
      .catch((err) => setCreateError(err.response?.data?.message || 'Failed to create project'))
      .finally(() => setCreateSubmitting(false));
  }

  function handleDelete(projectId: number) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    api
      .delete(`/api/projects/${projectId}`)
      .then(() => {
        setList((prev) => prev.filter((p) => p.id !== projectId));
        setDeleteId(null);
      })
      .catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3d3399] text-white font-medium hover:bg-[#2d2389] transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8v8m0-8H4" />
            </svg>
            Create Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            No projects found.
          </div>
        ) : (
          list.map((p) => {
            const total = p.total_tasks ?? 0;
            const completed = p.completed_tasks ?? 0;
            const progress = p.progress ?? 0;
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition"
              >
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 truncate">{p.project_name ?? 'Unnamed'}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Project</p>
                    </div>
                    <div className="relative group">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        aria-label="Menu"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      <div className="absolute right-0 mt-1 w-48 py-1 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible z-10">
                        <Link
                          to={`/projects/${p.id}`}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                        {(isTechnicalDirector || isManagement) && (
                          <Link
                            to={`/projects/${p.id}#milestones`}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Payment Milestones
                          </Link>
                        )}
                        {canEdit && (
                          <Link
                            to={`/projects/${p.id}`}
                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(p.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-full border-4 border-slate-200 flex items-center justify-center text-sm font-semibold text-[#3d3399]">
                      {progress}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Tasks Done</span>
                        <span className="font-medium text-slate-700">
                          {completed}<small className="text-slate-500">/{total}</small>
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3d3399] rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Updated</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-xs text-slate-500">{total} task{total !== 1 ? 's' : ''}</span>
                  <Link
                    to={`/projects/${p.id}`}
                    className="text-sm font-medium text-[#3d3399] hover:underline inline-flex items-center gap-1"
                  >
                    Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">New Project</h3>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{createError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
                <input
                  type="text"
                  value={createBudget}
                  onChange={(e) => setCreateBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d3399] focus:border-transparent"
                  placeholder="Enter budget"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#3d3399] text-white font-medium hover:bg-[#2d2389] disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Project</h3>
            <p className="text-slate-600 mb-4">Are you sure you want to delete this project?</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}