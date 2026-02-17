import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface TaskDetailType {
  id: number;
  task_name?: string;
  status?: string;
  due_date?: string;
  category?: string;
  description?: string;
  project_name?: string;
  projectid?: number;
  assigned_full_name?: string;
  uploader_full_name?: string;
  created_at?: string;
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<TaskDetailType>(`/api/tasks/${id}`)
      .then(({ data }) => setTask(data))
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-slate-500">
        Task not found. <Link to="/tasks" className="text-[#3d3399] hover:underline">Back to Tasks</Link>
      </div>
    );
  }

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

  return (
    <div className="space-y-4">
      <Link to="/tasks" className="text-[#3d3399] hover:underline text-sm font-medium inline-flex items-center gap-1">
        &larr; Back to Tasks
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{task.task_name ?? 'Task'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{task.project_name && `Project: ${task.project_name}`}</p>
          </div>
          <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-slate-100 text-slate-700">
            {task.status ?? '-'}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Due Date</dt>
            <dd className="font-medium text-slate-800">{formatDate(task.due_date)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Category</dt>
            <dd className="font-medium text-slate-800">{task.category ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Assigned to</dt>
            <dd className="font-medium text-slate-800">{task.assigned_full_name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created by</dt>
            <dd className="font-medium text-slate-800">{task.uploader_full_name ?? '-'}</dd>
          </div>
        </dl>
        {task.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-slate-500 text-sm mb-1">Description</dt>
            <p className="text-slate-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
