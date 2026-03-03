import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VscEye } from "react-icons/vsc";
import { BiEdit } from "react-icons/bi";
import { RiDeleteBin5Fill } from "react-icons/ri";
import { FaCircleDollarToSlot } from "react-icons/fa6"; interface Project {
  id: number;
  project_name?: string;
  progress?: number;
  total_tasks?: number;
  completed_tasks?: number;
  budget?: string;
  module_name?: string;
  client_name?: string;
  project_manager?: string;
  start_date?: string;
  end_date?: string;
  total_hours?: string;
  per_day?: string;
  department?: string;
  bim_lead?: string;
  bim_co_ordinator?: string;
  member?: string;
  resources?: string;
  required_resources?: string;
  priority?: string;
  location?: string;
  description?: string;
}

export default function ProjectsPM() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createBudget, setCreateBudget] = useState('');
  const [createModuleName, setCreateModuleName] = useState('');
  const [createClientName, setCreateClientName] = useState('');
  const [createProjectManager, setCreateProjectManager] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createTotalHours, setCreateTotalHours] = useState('');
  const [createPerDay, setCreatePerDay] = useState('');
  const [createDepartment, setCreateDepartment] = useState('');
  const [createBIMLead, setCreateBIMLead] = useState('');
  const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState('');
  const [createMember, setCreateMember] = useState('');
  const [createResources, setCreateResources] = useState('');
  const [createRequiredResources, setCreateRequiredResources] = useState('');
  const [createPriority, setCreatePriority] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createFile, setCreateFile] = useState<File | null>(null);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectView, setShowProjectView] = useState(false);
  const [selectedProjectForView, setSelectedProjectForView] = useState<Project | null>(null);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [selectedProjectForMilestones, setSelectedProjectForMilestones] = useState<Project | null>(null);

  // Add Milestone Modal State
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [milestoneNotes, setMilestoneNotes] = useState('');

  // Edit Project Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<Project | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const panelType = user?.panel_type ?? 3;
  const isManagement = panelType === 1;
  const isTechnicalDirector = user?.user_role === 'Technical Director';
  const canCreate = isManagement;
  const canEdit = panelType !== 3;
  const canDelete = isManagement;
  const title = isManagement ? 'Projects' : 'Projects Involved';

  useEffect(() => {
    // Mock data for UI testing - Added more projects to show scrollbar
    const mockProjects: Project[] = [
      { id: 1, project_name: 'AECOM - AL AIN HOSPITAL', progress: 50, total_tasks: 15, completed_tasks: 7 },
      { id: 2, project_name: 'AL GURG', progress: 25, total_tasks: 4, completed_tasks: 1 },
      { id: 3, project_name: 'ARATT - AYATHI RESIDENTIAL', progress: 47, total_tasks: 70, completed_tasks: 30 },
      { id: 4, project_name: 'GHAF WOODS DEVELOPMENT', progress: 0, total_tasks: 0, completed_tasks: 0 },
      { id: 5, project_name: 'Guggenheim Abu Dhabi Museum', progress: 78, total_tasks: 23, completed_tasks: 18 },
      { id: 6, project_name: 'Prestige Park Grove Phase 1', progress: 80, total_tasks: 135, completed_tasks: 110 },
      { id: 7, project_name: 'Sobha Hartland Greens', progress: 60, total_tasks: 20, completed_tasks: 12 },
      { id: 8, project_name: 'Dubai Hills Estate', progress: 10, total_tasks: 50, completed_tasks: 5 },
      { id: 9, project_name: 'Palm Jumeirah Resort', progress: 95, total_tasks: 100, completed_tasks: 95 },
      { id: 10, project_name: 'EMAAR Beachfront', progress: 40, total_tasks: 25, completed_tasks: 10 },
      { id: 11, project_name: 'Damac Hills 2', progress: 20, total_tasks: 15, completed_tasks: 3 },
      { id: 12, project_name: 'Business Bay Office Tower', progress: 70, total_tasks: 30, completed_tasks: 21 },
    ];
    setList(mockProjects);
    setLoading(false);
  }, []);





  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden">
        {/* Main Content View Switcher */}
        {showProjectView && selectedProjectForView ? (
          <div className="flex flex-col h-full bg-white">
            {/* Project View Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 px-6 py-6 md:px-10 md:py-8 border-b border-slate-50">
              <button
                type="button"
                onClick={() => setShowProjectView(false)}
                className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h3 className="text-[22px] md:text-[26px] font-Gantari font-bold text-[#1A1A1A]">
                  {selectedProjectForView.project_name ?? 'Prestige Park Grove'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-0.5">
                  <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">Tower 1 to 09</p>
                  <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-[#999999]"></span>
                  <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">Overall Progress Tracker</p>
                </div>
              </div>
            </div>

            {/* Project View Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
              {/* Task Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#DD4342] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-white text-[17px] font-Gantari font-bold opacity-90">To Do Tasks</p>
                  <p className="text-white text-[48px] font-Gantari font-bold leading-none">13</p>
                </div>
                <div className="bg-[#F4F5F7] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-[#333333] text-[17px] font-Gantari font-bold opacity-90">In Progress Tasks</p>
                  <p className="text-[#333333] text-[40px] md:text-[48px] font-Gantari font-bold leading-none">18</p>
                </div>
                <div className="bg-[#F4F5F7] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-[#333333] text-[17px] font-Gantari font-bold opacity-90">Paused Tasks</p>
                  <p className="text-[#333333] text-[40px] md:text-[48px] font-Gantari font-bold leading-none">02</p>
                </div>
                <div className="bg-[#F4F5F7] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-[#333333] text-[17px] font-Gantari font-bold opacity-90">Completed Tasks</p>
                  <p className="text-[#333333] text-[40px] md:text-[48px] font-Gantari font-bold leading-none">122</p>
                </div>
              </div>

              {/* Tower Progress Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border border-slate-100 rounded-[2rem] p-6 md:p-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                  const towerProgress = i % 3 === 0 ? 35 : i % 2 === 0 ? 65 : 86;
                  const status = i % 3 === 0 ? 'Review' : i % 2 === 0 ? 'Pending' : 'Approved';
                  const statusColor = i % 3 === 0 ? '#DD4342' : i % 2 === 0 ? '#FF9F00' : '#0A9344';
                  const statusBg = i % 3 === 0 ? 'bg-[#FFEBEC]' : i % 2 === 0 ? 'bg-[#FFF4E5]' : 'bg-[#E7F6ED]';

                  return (
                    <div key={i} className="bg-white border border-slate-100 rounded-[1.5rem] p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">Tower 0{i}</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusBg}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }}></span>
                          <span className="text-[12px] font-bold" style={{ color: statusColor }}>{status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center w-20 h-20">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="34" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                            <circle
                              cx="40" cy="40" r="34" stroke={statusColor} strokeWidth="6" fill="transparent"
                              strokeDasharray={213.6} strokeDashoffset={213.6 - (towerProgress / 100) * 213.6} strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[15px] font-bold text-[#1A1A1A]">{towerProgress}%</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-bold text-[#999999] mb-1">Tasks Done</p>
                          <p className="text-[18px] font-bold text-[#1A1A1A]">20<span className="text-[#999999]">/28</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Team Overview Section */}
              <div className="border border-slate-100 rounded-[2rem] p-6 md:p-10">
                <h4 className="text-[20px] md:text-[22px] font-Gantari font-bold text-[#1A1A1A] mb-8">Team Overview</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                  <div className="flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?u=pm" className="w-14 h-14 rounded-full border-2 border-white shadow-sm" alt="PM" />
                    <div>
                      <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">Reed Richards</p>
                      <p className="text-[15px] font-Gantari font-bold text-[#999999]">Project Manager</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?u=bim" className="w-14 h-14 rounded-full border-2 border-white shadow-sm" alt="BIM" />
                    <div>
                      <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">Richard Parker</p>
                      <p className="text-[15px] font-Gantari font-bold text-[#999999]">BIM Lead</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-1">Department Involved</p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">MEP (Dept)</p>
                  </div>
                  <div>
                    <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-2">Members Involved</p>
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(j => (
                        <div key={j} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                          <img src={`https://i.pravatar.cc/150?u=${j}`} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                        +4
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Details Section */}
              <div className="border border-slate-100 rounded-[2rem] p-6 md:p-10">
                <h4 className="text-[20px] md:text-[22px] font-Gantari font-bold text-[#1A1A1A] mb-8">Project Details</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Client Name</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">Mark Specter</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Actual Start Date</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">dd/mm/yyyy</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Total Project Hours</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">000hrs</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Budget</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">000000$</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Total Resources Available</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">000</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Location</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">Bengaluru, KA</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Actual End Date</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">dd/mm/yyyy</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Hours/Day</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">0:00hrs</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Total Resources Required</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">000</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Required Resources</span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">000</span>
                    </div>
                  </div>
                </div>
                <div className="mt-12 flex items-center">
                  <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">Project Document</span>
                  <span className="text-[#999999] mr-4">:</span>
                  <div className="flex items-center gap-3">
                    <a href="#" className="text-[16px] font-Gantari font-bold text-[#1D7AFC] hover:underline">Document.pdf</a>
                    <button className="p-2 rounded-lg bg-[#E2EEFF] text-[#1D7AFC] hover:bg-[#D5E6FF] transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showMilestones && currentProject ? (
          <div className="flex flex-col h-full bg-white">
            {/* Milestones Header */}
            <div className="flex items-center justify-between px-10 py-8">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setShowMilestones(false)}
                  className="p-3.5 rounded-xl bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-[26px] font-Gantari font-bold text-[#1A1A1A]">Payment Milestones</h3>
                  <p className="text-[16px] font-Gantari font-bold text-[#999999] mt-0.5">
                    {currentProject.project_name ?? 'Prestige Park Grove'}_Tower 1 to 09
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[16px] shadow-sm hover:bg-[#c93a39] transition-colors"
                title="Add Milestone"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
                Add Milestone
              </button>
            </div>

            {/* Milestones Content - No Scroll Version */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-10 pb-10 custom-scrollbar">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-[#DD4342] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-white text-[16px] font-Gantari font-bold opacity-90">Total Amount</p>
                  <p className="text-white text-[32px] font-Gantari font-bold">10,000,00</p>
                </div>
                <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-[#333333] text-[16px] font-Gantari font-bold">Paid Amount</p>
                  <p className="text-[#333333] text-[32px] font-Gantari font-bold">4,000,00</p>
                </div>
                <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-[#333333] text-[16px] font-Gantari font-bold">Pending Amount</p>
                  <p className="text-[#333333] text-[32px] font-Gantari font-bold">6,000,00</p>
                </div>
                <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-[#333333] text-[16px] font-Gantari font-bold">Progress</p>
                  <p className="text-[#333333] text-[32px] font-Gantari font-bold">72%</p>
                </div>
              </div>

              {/* Central Box Area - Now Flexible */}
              <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[2.5rem] bg-white px-24 flex flex-col items-center justify-center text-center">
                <h4 className="text-[22px] font-Gantari font-bold text-[#353535] mb-2">No Payment Milestones Found</h4>
                <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-10 max-w-sm">
                  Add your First Payment to get started with payment tracking
                </p>
                <button
                  onClick={() => setShowAddMilestoneModal(true)}
                  className="flex items-center gap-2 px-10 py-4 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[18px] shadow-lg shadow-red-500/10 hover:bg-[#c93a39] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Milestone
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Header */}
            <div className="flex items-center justify-between pb-6">
              <h2 className="text-[24px] font-Gantari font-semibold text-[#000000]">{title}</h2>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 p-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[16px] font-Gantari font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Project
                </button>
              )}
            </div>

            {/* Dashboard Content with Scrollbar */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-4 pl-4 pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {list.length === 0 ? (
                  <div className="col-span-full bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                    No projects found.
                  </div>
                ) : (
                  list.map((p) => {
                    const total = p.total_tasks ?? 0;
                    const completed = p.completed_tasks ?? 0;
                    const progress = Math.round(p.progress ?? 0);

                    const radius = 28;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (progress / 100) * circumference;

                    return (
                      <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                        <div>
                           <div className="flex items-center justify-between mb-8 mt-4 pr-2">
                            <div className="relative flex items-center justify-center">
                              <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                                <circle
                                  cx="40" cy="40" r={radius} stroke="#0a9344" strokeWidth="6" fill="transparent"
                                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                />
                              </svg>
                              <span className="absolute text-base font-Gantari font-bold text-[#353535]">{progress}%</span>
                            </div>
                            <div className="relative group">
                              <button type="button" className="rounded-full text-[#8B8B8B]">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              <div className="absolute -right-40 w-80  bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] opacity-0 invisible group-hover:opacity-100 group-hover:visible z-20 transition-all duration-200">
                                <button
                                  onClick={() => {
                                    setSelectedProjectForView(p);
                                    setShowProjectView(true);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari" >
                                  <VscEye className="w-6 h-6" />
                                  <span className="text-[20px] font-semibold text-[#6B6B6B] hover:text-[#DD4342]">View</span>
                                </button>
                                {(isTechnicalDirector || isManagement) && (
                                  <button
                                    onClick={() => {
                                      setCurrentProject(p);
                                      setShowMilestones(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                  >
                                    <FaCircleDollarToSlot className="w-6 h-6" />
                                    <span className="text-[20px] font-semibold text-[#6B6B6B] hover:text-[#DD4342]">Payment Milestones</span>
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setSelectedProjectForEdit(p);
                                      setCreateName(p.project_name ?? '');
                                      setCreateBudget(p.budget ?? '');
                                      setCreateModuleName(p.module_name ?? '');
                                      setCreateClientName(p.client_name ?? '');
                                      setCreateProjectManager(p.project_manager ?? '');
                                      setCreateStartDate(p.start_date ?? '');
                                      setCreateEndDate(p.end_date ?? '');
                                      setCreateTotalHours(p.total_hours ?? '');
                                      setCreatePerDay(p.per_day ?? '');
                                      setCreateDepartment(p.department ?? '');
                                      setCreateBIMLead(p.bim_lead ?? '');
                                      setCreateBIMCoOrdinator(p.bim_co_ordinator ?? '');
                                      setCreateMember(p.member ?? '');
                                      setCreateResources(p.resources ?? '');
                                      setCreateRequiredResources(p.required_resources ?? '');
                                      setCreatePriority(p.priority ?? '');
                                      setCreateLocation(p.location ?? '');
                                      setCreateDescription(p.description ?? '');
                                      setShowEditModal(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                  >
                                    <BiEdit className="w-6 h-6" />
                                    <span className="text-[20px] font-semibold text-[#6B6B6B] hover:text-[#DD4342]">Edit</span>
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => setDeleteId(p.id)}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                  >
                                    <RiDeleteBin5Fill className="w-6 h-6" />
                                    <span className="text-[20px] font-semibold text-[#6B6B6B] hover:text-[#DD4342]">Delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-[20px] font-Gantari font-semibold text-[#353535] leading-tight mb-1">
                                {p.project_name ?? 'Prestige Park Groove'}
                              </h3>
                              <p className="text-[16px] font-Gantari font-semibold text-[#353535]">Tower 1 to 09</p>
                            </div>

                          </div>

                         
                        </div>
                        <div className="flex items-center justify-between border-t border-[#F1F1F1] pt-5 mt-auto">
                          <div className="flex -space-x-5">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                                <img src={`https://i.pravatar.cc/150?u=${p.id + i}`} alt="avatar" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            <div className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                              +4
                            </div>
                          </div>

                          <Link to={`/projects/${p.id}`} className="flex items-center gap-1.5 text-[16px] font-Gantari font-semibold text-[#8B8B8B] transition-colors group">
                            Details
                            <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 7l-10 10M17 7H7M17 7v10" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl border-2 border-gray-100 max-w-4xl w-full flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-8 py-6">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                className="absolute left-6 p-2 rounded-lg bg-[#F2F2F2] text-[#000000]"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-semibold text-[#000000]">Add New Project</h3>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar">
              <form onSubmit={(e) => { e.preventDefault(); setShowCreateModal(false); }} className="space-y-6">
                {createError && (
                  <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">{createError}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Project Name & Budget */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000]">Project Name</label>
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Project name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Budget</label>
                    <input
                      type="text"
                      value={createBudget}
                      onChange={(e) => setCreateBudget(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Project Budget"
                    />
                  </div>
                  {/* Module Name - Full Width */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Module Name</label>
                    <input
                      type="text"
                      value={createModuleName}
                      onChange={(e) => setCreateModuleName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Module Name"
                    />
                  </div>

                  {/* Client Name & Project Manager */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Client Name</label>
                    <input
                      type="text"
                      value={createClientName}
                      onChange={(e) => setCreateClientName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Client Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Select Project Manager</label>
                    <div className="relative">
                      <select
                        value={createProjectManager}
                        onChange={(e) => setCreateProjectManager(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select Project Manager</option>
                        <option value="manager1">Manager 1</option>
                        <option value="manager2">Manager 2</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Project Start Date</label>
                    <input
                      type="text"
                      value={createStartDate}
                      onChange={(e) => setCreateStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Project End Date*</label>
                    <input
                      type="text"
                      value={createEndDate}
                      onChange={(e) => setCreateEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>

                  {/* Hours */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Total Hours*</label>
                    <input
                      type="text"
                      value={createTotalHours}
                      onChange={(e) => setCreateTotalHours(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Total Hours"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Per Day*</label>
                    <input
                      type="text"
                      value={createPerDay}
                      onChange={(e) => setCreatePerDay(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Per Day Hours"
                    />
                  </div>

                  {/* Department & BIM Lead */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Select Department</label>
                    <div className="relative">
                      <select
                        value={createDepartment}
                        onChange={(e) => setCreateDepartment(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select Department</option>
                        <option value="it">IT</option>
                        <option value="bim">BIM</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Select BIM Lead</label>
                    <div className="relative">
                      <select
                        value={createBIMLead}
                        onChange={(e) => setCreateBIMLead(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select BIM Lead</option>
                        <option value="lead1">Lead 1</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* BIM Co-ordinator & Member */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Select BIM Co Ordinator</label>
                    <div className="relative">
                      <select
                        value={createBIMCoOrdinator}
                        onChange={(e) => setCreateBIMCoOrdinator(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select BIM Co Ordinator</option>
                        <option value="coord1">Co-ordinator 1</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Select Member</label>
                    <div className="relative">
                      <select
                        value={createMember}
                        onChange={(e) => setCreateMember(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select Member</option>
                        <option value="member1">Member 1</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Resources */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Resources</label>
                    <input
                      type="text"
                      value={createResources}
                      onChange={(e) => setCreateResources(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Actual Resources"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Required Resources</label>
                    <input
                      type="text"
                      value={createRequiredResources}
                      onChange={(e) => setCreateRequiredResources(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Required Resources"
                    />
                  </div>

                  {/* Priority & Location */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Priority</label>
                    <div className="relative">
                      <select
                        value={createPriority}
                        onChange={(e) => setCreatePriority(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Location</label>
                    <input
                      type="text"
                      value={createLocation}
                      onChange={(e) => setCreateLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Project Location"
                    />
                  </div>

                  {/* Description - Full Width */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Project Description*</label>
                    <textarea
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400 resize-none"
                      placeholder="Type Project Description"
                    />
                  </div>

                  {/* Attach File - Full Width */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">Attach File*</label>
                    <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                      <div className="flex-1 px-4 py-3 text-gray-400 font-medium">
                        {createFile ? createFile.name : 'Choose File'}
                      </div>
                      <label className="px-6 py-3 bg-gray-200 text-gray-600 font-semibold text-sm cursor-pointer hover:bg-gray-300 transition-colors uppercase tracking-wider">
                        Browse File
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => setCreateFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-center gap-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-10 py-3 rounded-[5px] bg-[#F1F1F1] text-gray-700 font-semibold transition-all hover:bg-gray-200"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-10 py-3 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-semibold transition-all hover:bg-[#D5E6FF] disabled:opacity-50"
                  >
                    {createSubmitting ? 'Creating...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full p-12 relative flex flex-col items-center">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="absolute left-10 top-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <h3 className="text-[28px] font-Gantari font-bold text-[#1A1A1A] mt-4 mb-3">Delete Project</h3>
            <p className="text-[18px] font-Gantari font-bold text-[#353535] mb-10 text-center">
              Are you sure, you want to Delete this?
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-12 py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-12 py-3.5 rounded-[5px] bg-[#FFEBEC] text-[#DD4342] font-Gantari font-bold text-[16px] transition-all hover:bg-[#FFDEDE]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full flex flex-col p-10">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center mb-10">
              <button
                type="button"
                onClick={() => setShowAddMilestoneModal(false)}
                className="absolute left-0 p-3 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">Add Payment Milestone</h3>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => { e.preventDefault(); setShowAddMilestoneModal(false); }} className="space-y-6 px-1">
              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Milestone Name*</label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-xl focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                  placeholder="Enter Milestone name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Amount ($)*</label>
                <input
                  type="text"
                  value={milestoneAmount}
                  onChange={(e) => setMilestoneAmount(e.target.value)}
                  className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                  placeholder="Enter Amount"
                  required
                />
                <div className="flex justify-between text-[13px] font-Gantari font-bold text-[#999999]">
                  <span>Project Budget: 5,000,00$</span>
                  <span>Available Budget: 5,000,00$</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Due Date*</label>
                <div className="relative">
                  <input
                    type="text"
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                    className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                    placeholder="dd/mm/yyyy"
                    required
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Notes</label>
                <textarea
                  value={milestoneNotes}
                  onChange={(e) => setMilestoneNotes(e.target.value)}
                  rows={4}
                  className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400 resize-none"
                  placeholder="Type Your Notes..."
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-center gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-12 py-3.5 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-12 py-3.5 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-8">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="absolute left-10 p-3 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">Edit Details</h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-10 custom-scrollbar">
              <form onSubmit={(e) => { e.preventDefault(); setShowEditModal(false); }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {/* Row 1 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Project Name</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Project name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Modules Name</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Module Name"
                      value={createModuleName}
                      onChange={(e) => setCreateModuleName(e.target.value)}
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Budget</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Budget"
                      value={createBudget}
                      onChange={(e) => setCreateBudget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Task Name</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Task Name"
                    />
                  </div>

                  {/* Row 3 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Client Name</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Client Name"
                      value={createClientName}
                      onChange={(e) => setCreateClientName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Select Priority</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>Select Priority</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Start Date</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>dd/mm/yyyy</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">End Date</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="dd/mm/yyyy"
                      value={createEndDate}
                      onChange={(e) => setCreateEndDate(e.target.value)}
                    />
                  </div>

                  {/* Row 5 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Total Hours</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="hh:mm:ss"
                      value={createTotalHours}
                      onChange={(e) => setCreateTotalHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Total Hours Per Day</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="hh:mm:ss"
                      value={createPerDay}
                      onChange={(e) => setCreatePerDay(e.target.value)}
                    />
                  </div>

                  {/* Row 6 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Select Department</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>Select Department</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Select Project Manager</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>Select Project Manager</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Row 7 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Select BIM Lead</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>Select BIM Lead</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Select BIM Co Ordinator</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>Select BIM Co Ordinator</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Row 8 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Select Member</label>
                    <div className="relative">
                      <select className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 appearance-none transition-all font-Gantari font-medium text-gray-400 cursor-pointer">
                        <option>Select Member</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Location</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Location"
                      value={createLocation}
                      onChange={(e) => setCreateLocation(e.target.value)}
                    />
                  </div>

                  {/* Row 9 */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Resources</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Resources"
                      value={createResources}
                      onChange={(e) => setCreateResources(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Required Resources</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Required Resources"
                      value={createRequiredResources}
                      onChange={(e) => setCreateRequiredResources(e.target.value)}
                    />
                  </div>

                  {/* Description - Full Width */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Project Description</label>
                    <textarea
                      rows={4}
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400 resize-none"
                      placeholder="Type Job Description..."
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                    />
                  </div>

                  {/* Attach File - Full Width */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">Attach File</label>
                    <div className="flex items-center bg-[#F4F5F7] rounded-[5px] overflow-hidden">
                      <div className="flex-1 px-5 py-3.5 text-gray-400 font-medium">Choose file</div>
                      <button type="button" className="px-6 py-3.5 bg-[#E0E0E0] text-[#666666] font-bold text-sm hover:bg-gray-300 transition-colors">
                        Browse File
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-12 py-3 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="px-12 py-3 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm"
                  >
                    {isEditSubmitting ? 'Updating...' : 'Update Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}