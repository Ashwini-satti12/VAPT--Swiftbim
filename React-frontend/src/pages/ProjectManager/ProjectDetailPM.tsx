import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';

interface Project {
  id: number;
  project_name?: string;
  progress?: number;
  status?: string;
  description?: string;
}

export default function ProjectDetailPM() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<Project>(`/api/projects/${id}`)
      .then(({ data }) => setProject(data))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12 text-slate-500">
        Project not found. <Link to="/projects" className="text-indigo-600 hover:underline">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/projects" className="text-indigo-600 hover:underline text-sm font-medium">
        &larr; Back to Projects
      </Link>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">{project.project_name ?? 'Project'}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Progress</dt>
            <dd className="font-medium text-slate-800">{project.progress ?? 0}%</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium text-slate-800">{project.status ?? '-'}</dd>
          </div>
        </dl>
        {project.description && (
          <p className="mt-4 text-slate-600">{project.description}</p>
        )}
      </div>
    </div>
  );
}
