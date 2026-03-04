import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../lib/api";

const apiBase = (api.defaults.baseURL as string) || '';
import { VscEye } from "react-icons/vsc";
import { BiDotsVerticalRounded, BiEdit } from "react-icons/bi";
import { RiDeleteBin5Fill } from "react-icons/ri";
import { FiX } from "react-icons/fi";
import Dot from "../../assets/ProjectManager/MyTask/Dot.svg";
import { FaCircleDollarToSlot } from "react-icons/fa6";

interface Project {
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
  budget_ceiling?: string;
  bidding_end_date?: string;
}

interface Employee {
  id: number;
  full_name?: string;
  user_role?: string;
  empid?: string;
  profile_picture?: string;
  email?: string;
  phone_number?: string;
  dob?: string;
  doj?: string;
  user_type?: string;
  address?: string;
  department?: string;
}

export default function ProjectsTD() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [createModuleName, setCreateModuleName] = useState("");
  const [createClientName, setCreateClientName] = useState("");
  const [createProjectManager, setCreateProjectManager] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createTotalHours, setCreateTotalHours] = useState("");
  const [createPerDay, setCreatePerDay] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createBIMLead, setCreateBIMLead] = useState("");
  const [createBIMCoOrdinator, setCreateBIMCoOrdinator] = useState("");
  const [createMember, setCreateMember] = useState("");
  const [createResources, setCreateResources] = useState("");
  const [createRequiredResources, setCreateRequiredResources] = useState("");
  const [createPriority, setCreatePriority] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectView, setShowProjectView] = useState(false);
  const [selectedProjectForView, setSelectedProjectForView] =
    useState<Project | null>(null);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [selectedProjectForMilestones, setSelectedProjectForMilestones] =
    useState<Project | null>(null);

  // Add Milestone Modal State
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");
  const [milestoneNotes, setMilestoneNotes] = useState("");

  // Edit Project Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] =
    useState<Project | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(
    null,
  );
  const [editDropdownOpen, setEditDropdownOpen] = useState<
    'source' | 'pm' | 'bimLead' | 'bimCoord' | null
  >(null);
  const [createBudgetCeiling, setCreateBudgetCeiling] = useState("");
  const [createBiddingEndDate, setCreateBiddingEndDate] = useState("");

  // Employee data for dropdowns
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projectManagers, setProjectManagers] = useState<Employee[]>([]);
  const [bimLeads, setBimLeads] = useState<Employee[]>([]);
  const [bimCoordinators, setBimCoordinators] = useState<Employee[]>([]);

  // All employees for member lookup
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Profile modal state
  const [showMemberProfileModal, setShowMemberProfileModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Employee | null>(null);

  // All members modal state
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [allMembersList, setAllMembersList] = useState<Employee[]>([]);

  // Task statistics for project view
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    paused: 0,
    completed: 0,
  });
  const [towerData, setTowerData] = useState<Array<{
    id: number;
    name: string;
    progress: number;
    completedTasks: number;
    totalTasks: number;
    status: 'Approved' | 'Pending' | 'Review';
  }>>([]);
  const [loadingTaskStats, setLoadingTaskStats] = useState(false);

  const panelType = user?.panel_type ?? 3;
  const isEditSourceInHouse = createDepartment === "Budget Ceiling";
  const isEditSourceOutsource = createDepartment === "Submission Deadline";
  const isManagement = panelType === 1;
  const isTechnicalDirector = user?.user_role === "Technical Director";
  const canCreate = isManagement;
  const canEdit = panelType !== 3;
  const canDelete = isManagement;
  const title = isManagement ? "Projects" : "Projects Involved";

  const mapApiProjectToProject = (r: Record<string, unknown>): Project => {
    const num = (v: unknown) =>
      v === null || v === undefined ? undefined : Number(v);
    const str = (v: unknown) => (v != null ? String(v) : undefined);
    const d = (v: unknown) =>
      v != null && typeof v === "string" ? v : undefined;
    return {
      id: num(r.id) ?? 0,
      project_name: str(r.project_name),
      progress: num(r.progress) ?? 0,
      total_tasks: num(r.total_tasks),
      completed_tasks: num(r.completed_tasks),
      budget: str(r.budget),
      module_name: str(r.modules),
      client_name: str(r.client_id),
      project_manager: str(r.project_manager_id),
      start_date: d(r.start_date),
      end_date: d(r.due_date),
      total_hours: str(r.totalhours),
      per_day: str(r.perday),
      department: str(r.department),
      budget_ceiling: str(r.budget_ceiling),
      bidding_end_date: str(r.bidding_end_date),
      bim_lead: str(r.lead_id),
      bim_co_ordinator: str(r.bim_coordinator_id),
      member: str(r.members),
      priority: str(r.priority),
      location: str(r.location),
      description: str(r.description),
    };
  };

  useEffect(() => {
    // Fetch employees for member lookup
    api
      .get<{ employees?: Employee[] }>("/api/employees")
      .then(({ data }) => {
        setAllEmployees(data.employees ?? []);
      })
      .catch(() => {
        setAllEmployees([]);
      });

    // Fetch projects - use data directly from projects table
    api
      .get<{ projects?: Record<string, unknown>[] }>("/api/projects")
      .then(({ data }) => {
        const projects = (data.projects ?? []).map(mapApiProjectToProject);
        setList(projects);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  // Fetch employees when edit modal opens
  useEffect(() => {
    if (showEditModal) {
      api
        .get<{ employees?: Employee[] }>("/api/employees")
        .then(({ data }) => {
          const allEmployees = data.employees ?? [];
          setEmployees(allEmployees);
          setProjectManagers(
            allEmployees.filter((e) => e.user_role === "Project Manager")
          );
          setBimLeads(
            allEmployees.filter((e) => e.user_role === "BIM Lead")
          );
          setBimCoordinators(
            allEmployees.filter((e) => e.user_role === "BIM Coordinator")
          );
        })
        .catch(() => {
          setEmployees([]);
          setProjectManagers([]);
          setBimLeads([]);
          setBimCoordinators([]);
        });
    }
  }, [showEditModal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside any dropdown
      if (!target.closest('.dropdown-container')) {
        setEditDropdownOpen(null);
      }
    };
    if (editDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [editDropdownOpen]);

  // Fetch task statistics and tower data for selected project view
  useEffect(() => {
    if (showProjectView && selectedProjectForView) {
      setLoadingTaskStats(true);
      const projectId = selectedProjectForView.id;

      // Initialize with project table data immediately
      const projectCompleted = selectedProjectForView.completed_tasks || 0;
      const projectTotal = selectedProjectForView.total_tasks || 0;

      // Set initial stats from project table so cards show data immediately
      setTaskStats({
        todo: Math.max(0, projectTotal - projectCompleted),
        inProgress: 0,
        paused: 0,
        completed: projectCompleted,
      });

      api
        .get<{
          tasks?: Array<{
            status?: string;
            modules_name?: string;
            projectid?: number | string;
            project_id?: number | string;
            Approval?: string;
          }>
        }>("/api/tasks", {
          params: {
            project_id: String(projectId),
            condition: "1" // Get all company tasks (Technical Director can see all)
          },
        })
        .then(({ data }) => {
          const tasks = data.tasks ?? [];

          // Helper function to normalize status - database uses "Completed", "Todo", "InProgress", "Pause"
          const normalizeStatus = (status: string | undefined): string => {
            if (!status) return "";
            const s = String(status).toLowerCase().trim();
            // Handle various status formats
            if (s === "todo" || s === "to do") return "todo";
            if (s === "inprogress" || s === "in progress" || s === "in_progress") return "inprogress";
            if (s === "pause" || s === "paused") return "pause";
            if (s === "completed" || s === "complete") return "completed";
            return s;
          };

          // API already filters by project_id, but double-check to ensure we have the right tasks
          const projectTasks = tasks.filter((t) => {
            const taskProjectId = t.projectid || t.project_id;
            if (taskProjectId == null) return false;
            // Compare as strings and numbers to handle both cases
            return String(taskProjectId) === String(projectId) || Number(taskProjectId) === Number(projectId);
          });

          // Debug: log tasks to see what we're getting
          console.log("=== TASK FETCH DEBUG ===");
          console.log("Project ID:", projectId, "Type:", typeof projectId);
          console.log("Total tasks from API:", tasks.length);
          console.log("Filtered project tasks:", projectTasks.length);
          if (tasks.length > 0) {
            console.log("Sample tasks:", tasks.slice(0, 5).map(t => ({
              projectid: t.projectid,
              project_id: t.project_id,
              status: t.status,
              statusLower: String(t.status || "").toLowerCase()
            })));
          }
          if (projectTasks.length > 0) {
            const statusCounts = projectTasks.reduce((acc, t) => {
              const status = normalizeStatus(t.status);
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            console.log("Status breakdown:", statusCounts);
            console.log("All statuses:", projectTasks.map(t => t.status));
          } else {
            console.warn("No tasks found for project! Check if project_id matches.");
          }

          // Calculate task statistics by status
          const stats = {
            todo: projectTasks.filter((t) => normalizeStatus(t.status) === "todo").length,
            inProgress: projectTasks.filter((t) => normalizeStatus(t.status) === "inprogress").length,
            paused: projectTasks.filter((t) => normalizeStatus(t.status) === "pause").length,
            completed: projectTasks.filter((t) => normalizeStatus(t.status) === "completed").length,
          };

          console.log("Final task stats:", stats);
          console.log("Total tasks counted:", stats.todo + stats.inProgress + stats.paused + stats.completed);
          console.log("Expected from projects table - completed:", selectedProjectForView.completed_tasks, "total:", selectedProjectForView.total_tasks);
          console.log("========================");

          // If we got tasks, use them; otherwise use project table data
          if (projectTasks.length > 0) {
            setTaskStats(stats);
          } else {
            // Fallback: Use project table data if no tasks found
            console.warn("No tasks found from API, using project table data");
            setTaskStats({
              todo: Math.max(0, projectTotal - projectCompleted),
              inProgress: 0,
              paused: 0,
              completed: projectCompleted,
            });
          }

          // Parse all modules from project's modules field
          const projectModules = selectedProjectForView.module_name || "";
          const allModuleNames: string[] = [];

          if (projectModules) {
            // Split by comma to get individual module entries
            // Format can be: "PD - Package1/Package 2/Package 3, DD - Package1/Package 2/Package 3, IFC - Package1/Package 2/Package 3"
            // Or: "Tower-1, Tower-2, Tower-3"
            // Or: "RAMP RD, NEXT TO CONE 9 PLAZA, ..."
            const parsedModules = projectModules
              .split(',')
              .map(m => m.trim())
              .filter(m => m.length > 0);

            // For each module entry, extract the main module name
            parsedModules.forEach(module => {
              let moduleName = module.trim();

              // Handle formats like "PD - Package1/Package 2/Package 3"
              // Extract the prefix (PD, DD, IFC) as the module identifier
              if (moduleName.includes(' - ')) {
                const parts = moduleName.split(' - ');
                if (parts.length > 1) {
                  // Use the prefix (PD, DD, IFC) as the module identifier
                  moduleName = parts[0].trim();
                }
              }

              // Handle formats with slashes - for formats like "Package1/Package 2", keep the first part
              // But if it's already a simple name, keep it as-is
              if (moduleName.includes('/') && !moduleName.includes(' - ')) {
                moduleName = moduleName.split('/')[0].trim();
              }

              // Add the module name if it's not empty and not already added
              if (moduleName && !allModuleNames.includes(moduleName)) {
                allModuleNames.push(moduleName);
              }
            });
          }

          console.log("Project modules from projects table:", allModuleNames);
          console.log("Raw modules field:", projectModules);

          // Group tasks by module/tower name from tasks
          const moduleTaskMap = new Map<string, {
            total: number;
            completed: number;
            approved: number;
          }>();

          projectTasks.forEach((task) => {
            const taskModuleName = (task.modules_name || "").trim();
            // Handle empty module names
            if (!taskModuleName || taskModuleName === "") {
              // Skip tasks without modules for now, or add to "Unassigned" later
              return;
            }

            // Extract module prefix if it contains " - " (e.g., "PD - Package1" -> "PD")
            let moduleKey = taskModuleName;
            if (taskModuleName.includes(' - ')) {
              const parts = taskModuleName.split(' - ');
              if (parts.length > 1) {
                moduleKey = parts[0].trim();
              }
            }

            // Also handle slashes (e.g., "PD/Package1" -> "PD")
            if (moduleKey.includes('/') && !moduleKey.includes(' - ')) {
              moduleKey = moduleKey.split('/')[0].trim();
            }

            const module = moduleKey || "Default";
            const status = normalizeStatus(task.status);
            const approval = (task.Approval || "").toLowerCase();

            if (!moduleTaskMap.has(module)) {
              moduleTaskMap.set(module, { total: 0, completed: 0, approved: 0 });
            }
            const moduleData = moduleTaskMap.get(module)!;
            moduleData.total++;

            if (status === "completed") {
              moduleData.completed++;
            }
            if (approval === "approved") {
              moduleData.approved++;
            }
          });

          // Also count unassigned tasks (tasks without modules_name)
          const unassignedTasks = projectTasks.filter(t => {
            const taskModuleName = (t.modules_name || "").trim();
            return !taskModuleName || taskModuleName === "";
          });

          if (unassignedTasks.length > 0) {
            moduleTaskMap.set("Unassigned", { total: 0, completed: 0, approved: 0 });
            const unassignedData = moduleTaskMap.get("Unassigned")!;
            unassignedTasks.forEach(task => {
              unassignedData.total++;
              const status = normalizeStatus(task.status);
              const approval = (task.Approval || "").toLowerCase();
              if (status === "completed") {
                unassignedData.completed++;
              }
              if (approval === "approved") {
                unassignedData.approved++;
              }
            });
          }

          // Convert to tower data array - show ALL modules from project
          const towers: Array<{
            id: number;
            name: string;
            progress: number;
            completedTasks: number;
            totalTasks: number;
            status: 'Approved' | 'Pending' | 'Review';
          }> = [];

          // Helper to format tower/module name for display
          const formatTowerName = (moduleName: string, index: number): string => {
            if (!moduleName || moduleName === "Default") {
              return `Tower ${String(index + 1).padStart(2, '0')}`;
            }

            // If module name contains "Tower" or a number, format it nicely
            const towerMatch = moduleName.match(/tower[\s-]?(\d+)/i);
            if (towerMatch) {
              return `Tower ${towerMatch[1].padStart(2, '0')}`;
            }

            // Try to extract number from module name
            const numMatch = moduleName.match(/\d+/);
            if (numMatch && moduleName.length < 30) {
              // If it's a simple numbered module, format as Tower
              return `Tower ${numMatch[0].padStart(2, '0')}`;
            }

            // Otherwise, use the module name as-is (truncate if too long)
            return moduleName.length > 25 ? moduleName.substring(0, 25) + "..." : moduleName;
          };

          // Process all modules from project
          if (allModuleNames.length > 0) {
            allModuleNames.forEach((moduleName, index) => {
              // Get task data for this module (if any)
              // Try exact match first
              let taskData = moduleTaskMap.get(moduleName) || { total: 0, completed: 0, approved: 0 };

              // If no exact match, try to find tasks where modules_name contains this module name
              if (taskData.total === 0) {
                for (const [taskModuleName, data] of moduleTaskMap.entries()) {
                  // Skip "Unassigned" when matching project modules
                  if (taskModuleName === "Unassigned") continue;

                  // Check if task's modules_name contains this project module name (case-insensitive)
                  const taskModuleLower = taskModuleName.toLowerCase();
                  const projectModuleLower = moduleName.toLowerCase();

                  // Try various matching strategies
                  if (taskModuleLower === projectModuleLower ||
                    taskModuleLower.startsWith(projectModuleLower) ||
                    projectModuleLower.startsWith(taskModuleLower) ||
                    taskModuleLower.includes(projectModuleLower) ||
                    projectModuleLower.includes(taskModuleLower)) {
                    taskData = {
                      total: taskData.total + data.total,
                      completed: taskData.completed + data.completed,
                      approved: taskData.approved + data.approved
                    };
                  }
                }
              }

              const progress = taskData.total > 0 ? Math.round((taskData.completed / taskData.total) * 100) : 0;

              // Determine status based on approval and progress
              let status: 'Approved' | 'Pending' | 'Review';
              const approvalRate = taskData.total > 0 ? (taskData.approved / taskData.total) : 0;

              if (taskData.total === 0) {
                status = 'Review'; // No tasks yet
              } else if (approvalRate >= 0.8 || progress >= 80) {
                status = 'Approved';
              } else if (progress >= 50 || approvalRate >= 0.5) {
                status = 'Pending';
              } else {
                status = 'Review';
              }

              towers.push({
                id: index + 1,
                name: formatTowerName(moduleName, index),
                progress,
                completedTasks: taskData.completed,
                totalTasks: taskData.total,
                status,
              });
            });

            // Add "Unassigned" module if there are tasks without modules
            const unassignedData = moduleTaskMap.get("Unassigned");
            if (unassignedData && unassignedData.total > 0) {
              const unassignedProgress = unassignedData.total > 0 ? Math.round((unassignedData.completed / unassignedData.total) * 100) : 0;
              let unassignedStatus: 'Approved' | 'Pending' | 'Review';
              const unassignedApprovalRate = unassignedData.total > 0 ? (unassignedData.approved / unassignedData.total) : 0;

              if (unassignedData.total === 0) {
                unassignedStatus = 'Review';
              } else if (unassignedApprovalRate >= 0.8 || unassignedProgress >= 80) {
                unassignedStatus = 'Approved';
              } else if (unassignedProgress >= 50 || unassignedApprovalRate >= 0.5) {
                unassignedStatus = 'Pending';
              } else {
                unassignedStatus = 'Review';
              }

              towers.push({
                id: allModuleNames.length + 1,
                name: "Unassigned",
                progress: unassignedProgress,
                completedTasks: unassignedData.completed,
                totalTasks: unassignedData.total,
                status: unassignedStatus,
              });
            }
          } else {
            // If no modules in project, check if we have modules from tasks
            if (moduleTaskMap.size > 0) {
              const sortedTaskModules = Array.from(moduleTaskMap.entries()).sort((a, b) => {
                const numA = parseInt(a[0].match(/\d+/)?.[0] || "0");
                const numB = parseInt(b[0].match(/\d+/)?.[0] || "0");
                return numA - numB;
              });

              sortedTaskModules.forEach(([moduleName, data], index) => {
                const progress = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

                let status: 'Approved' | 'Pending' | 'Review';
                const approvalRate = data.total > 0 ? (data.approved / data.total) : 0;

                if (approvalRate >= 0.8 || progress >= 80) {
                  status = 'Approved';
                } else if (progress >= 50 || approvalRate >= 0.5) {
                  status = 'Pending';
                } else {
                  status = 'Review';
                }

                towers.push({
                  id: index + 1,
                  name: formatTowerName(moduleName, index),
                  progress,
                  completedTasks: data.completed,
                  totalTasks: data.total,
                  status,
                });
              });
            } else {
              // Fallback: create default towers from project totals
              const totalTasks = selectedProjectForView.total_tasks || 0;
              const completedTasks = selectedProjectForView.completed_tasks || 0;

              for (let i = 1; i <= 8; i++) {
                const variation = (i % 3 === 0 ? -0.15 : i % 2 === 0 ? -0.05 : 0.05);
                const towerTotal = Math.max(1, Math.round((totalTasks / 8) * (1 + variation)));
                const towerCompleted = Math.max(0, Math.round((completedTasks / 8) * (1 + variation)));
                const towerProgress = towerTotal > 0 ? Math.round((towerCompleted / towerTotal) * 100) : 0;

                let status: 'Approved' | 'Pending' | 'Review';
                if (towerProgress >= 80) {
                  status = 'Approved';
                } else if (towerProgress >= 50) {
                  status = 'Pending';
                } else {
                  status = 'Review';
                }

                towers.push({
                  id: i,
                  name: `Tower ${String(i).padStart(2, '0')}`,
                  progress: towerProgress,
                  completedTasks: towerCompleted,
                  totalTasks: towerTotal,
                  status,
                });
              }
            }
          }

          setTowerData(towers);
        })
        .catch((err) => {
          console.error("Error fetching task stats:", err);
          console.error("Error details:", err.response?.data || err.message);
          // Fallback to project table data if API fails
          const projectCompleted = selectedProjectForView.completed_tasks || 0;
          const projectTotal = selectedProjectForView.total_tasks || 0;
          const fallbackStats = {
            todo: Math.max(0, projectTotal - projectCompleted),
            inProgress: 0,
            paused: 0,
            completed: projectCompleted,
          };
          console.log("Using fallback stats from project table:", fallbackStats);
          setTaskStats(fallbackStats);
          setTowerData([]);
        })
        .finally(() => setLoadingTaskStats(false));
    } else {
      // Reset when project view is closed
      setTaskStats({ todo: 0, inProgress: 0, paused: 0, completed: 0 });
      setTowerData([]);
    }
  }, [showProjectView, selectedProjectForView]);

  // Helper function to get employee name by ID
  const getEmployeeName = (id: string | number | undefined): string => {
    if (!id) return "";
    const emp = employees.find((e) => e.id === Number(id));
    return emp?.full_name || "";
  };

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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div>
                <h3 className="text-[22px] md:text-[26px] font-Gantari font-bold text-[#1A1A1A]">
                  {selectedProjectForView.project_name ?? "Prestige Park Grove"}
                </h3>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-0.5">
                  <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">
                    Tower 1 to 09
                  </p>
                  <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-[#999999]"></span>
                  <p className="text-[14px] md:text-[16px] font-Gantari font-bold text-[#999999]">
                    Overall Progress Tracker
                  </p>
                </div>
              </div>
            </div>

            {/* Project View Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 md:px-10 pb-10 pt-6 md:pt-8 custom-scrollbar space-y-8">
              {/* Task Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#DD4342] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-white text-[17px] font-Gantari font-bold opacity-90">
                    To Do Tasks
                  </p>
                  <p className="text-white text-[48px] font-Gantari font-bold leading-none">
                    {loadingTaskStats ? (
                      <span className="text-2xl">...</span>
                    ) : (
                      taskStats.todo
                    )}
                  </p>
                </div>
                <div className="bg-[#F4F5F7] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-[#333333] text-[17px] font-Gantari font-bold opacity-90">
                    In Progress Tasks
                  </p>
                  <p className="text-[#333333] text-[40px] md:text-[48px] font-Gantari font-bold leading-none">
                    {loadingTaskStats ? (
                      <span className="text-2xl">...</span>
                    ) : (
                      taskStats.inProgress
                    )}
                  </p>
                </div>
                <div className="bg-[#F4F5F7] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-[#333333] text-[17px] font-Gantari font-bold opacity-90">
                    Paused Tasks
                  </p>
                  <p className="text-[#333333] text-[40px] md:text-[48px] font-Gantari font-bold leading-none">
                    {loadingTaskStats ? (
                      <span className="text-2xl">...</span>
                    ) : (
                      taskStats.paused
                    )}
                  </p>
                </div>
                <div className="bg-[#F4F5F7] p-6 md:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between h-[160px] md:h-[180px]">
                  <p className="text-[#333333] text-[17px] font-Gantari font-bold opacity-90">
                    Completed Tasks
                  </p>
                  <p className="text-[#333333] text-[40px] md:text-[48px] font-Gantari font-bold leading-none">
                    {loadingTaskStats ? (
                      <span className="text-2xl">...</span>
                    ) : (
                      taskStats.completed
                    )}
                  </p>
                </div>
              </div>

              {/* Tower Progress Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border border-slate-100 rounded-[2rem] p-6 md:p-8">
                {loadingTaskStats ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Loading tower data...
                  </div>
                ) : towerData.length > 0 ? (
                  towerData.map((tower) => {
                    const statusColor =
                      tower.status === "Review"
                        ? "#DD4342"
                        : tower.status === "Pending"
                          ? "#FF9F00"
                          : "#0A9344";
                    const statusBg =
                      tower.status === "Review"
                        ? "bg-[#FFEBEC]"
                        : tower.status === "Pending"
                          ? "bg-[#FFF4E5]"
                          : "bg-[#E7F6ED]";
                    const circumference = 2 * Math.PI * 34;

                    return (
                      <div
                        key={tower.id}
                        className="bg-white border border-slate-100 rounded-[1.5rem] p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                            {tower.name}
                          </span>
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${statusBg}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: statusColor }}
                            ></span>
                            <span
                              className="text-[12px] font-bold"
                              style={{ color: statusColor }}
                            >
                              {tower.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="relative flex items-center justify-center w-20 h-20">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke="#F1F5F9"
                                strokeWidth="6"
                                fill="transparent"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke={statusColor}
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={
                                  circumference - (tower.progress / 100) * circumference
                                }
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-[15px] font-bold text-[#1A1A1A]">
                              {tower.progress}%
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[14px] font-bold text-[#999999] mb-1">
                              Tasks Done
                            </p>
                            <p className="text-[18px] font-bold text-[#1A1A1A]">
                              {tower.completedTasks}
                              <span className="text-[#999999]">/{tower.totalTasks}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No tower/module data available
                  </div>
                )}
              </div>

              {/* Team Overview Section */}
              <div className="border border-slate-100 rounded-[2rem] p-6 md:p-10">
                <h4 className="text-[20px] md:text-[22px] font-Gantari font-bold text-[#1A1A1A] mb-8">
                  Team Overview
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                  {/* Project Manager */}
                  {(() => {
                    const projectManagerId = selectedProjectForView.project_manager;
                    const projectManager = projectManagerId
                      ? allEmployees.find(e => Number(e.id) === Number(projectManagerId))
                      : null;
                    const pmProfileUrl = projectManager?.profile_picture
                      ? (projectManager.profile_picture.startsWith('http://') || projectManager.profile_picture.startsWith('https://')
                        ? projectManager.profile_picture
                        : `${apiBase}/uploads/${projectManager.profile_picture}`)
                      : null;

                    return (
                      <div className="flex items-center gap-4">
                        {pmProfileUrl ? (
                          <img
                            src={pmProfileUrl}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                            alt={projectManager?.full_name || "PM"}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=pm${projectManagerId}`;
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold">
                              {(projectManager?.full_name || "PM").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                            {projectManager?.full_name || "Not Assigned"}
                          </p>
                          <p className="text-[15px] font-Gantari font-bold text-[#999999]">
                            Project Manager
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* BIM Lead */}
                  {(() => {
                    const bimLeadId = selectedProjectForView.bim_lead;
                    const bimLead = bimLeadId
                      ? allEmployees.find(e => Number(e.id) === Number(bimLeadId))
                      : null;
                    const bimProfileUrl = bimLead?.profile_picture
                      ? (bimLead.profile_picture.startsWith('http://') || bimLead.profile_picture.startsWith('https://')
                        ? bimLead.profile_picture
                        : `${apiBase}/uploads/${bimLead.profile_picture}`)
                      : null;

                    return (
                      <div className="flex items-center gap-4">
                        {bimProfileUrl ? (
                          <img
                            src={bimProfileUrl}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                            alt={bimLead?.full_name || "BIM Lead"}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=bim${bimLeadId}`;
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold">
                              {(bimLead?.full_name || "BL").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                            {bimLead?.full_name || "Not Assigned"}
                          </p>
                          <p className="text-[15px] font-Gantari font-bold text-[#999999]">
                            BIM Lead
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Department Involved */}
                  <div>
                    <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-1">
                      Department Involved
                    </p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                      {selectedProjectForView.department || "Not Specified"}
                    </p>
                  </div>

                  {/* Members Involved */}
                  <div>
                    <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-2">
                      Members Involved
                    </p>
                    <div className="flex -space-x-3">
                      {(() => {
                        // Get members from project
                        const memberIds = selectedProjectForView.member
                          ? selectedProjectForView.member.split(',').map(m => m.trim()).filter(Boolean).map(Number)
                          : [];

                        // Get employee data for members
                        const projectMembers = memberIds
                          .map(id => allEmployees.find(e => Number(e.id) === Number(id)))
                          .filter(Boolean) as Employee[];

                        // Show up to 3 members, then +X for remaining
                        const visibleMembers = projectMembers.slice(0, 3);
                        const remainingCount = Math.max(0, projectMembers.length - 3);

                        // Helper to get profile image URL
                        const getProfileImageUrl = (emp: Employee) => {
                          if (emp.profile_picture) {
                            if (emp.profile_picture.startsWith('http://') || emp.profile_picture.startsWith('https://')) {
                              return emp.profile_picture;
                            }
                            return `${apiBase}/uploads/${emp.profile_picture}`;
                          }
                          return null;
                        };

                        return (
                          <>
                            {visibleMembers.length > 0 ? (
                              visibleMembers.map((emp) => {
                                const profileUrl = getProfileImageUrl(emp);
                                return (
                                  <div
                                    key={emp.id}
                                    className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm"
                                    title={emp.full_name || `Employee ${emp.id}`}
                                  >
                                    {profileUrl ? (
                                      <img
                                        src={profileUrl}
                                        alt={emp.full_name || "Member"}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${emp.id}`;
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                        {(emp.full_name || `E${emp.id}`).charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              // Fallback: show placeholder if no members
                              [1, 2, 3].map((j) => (
                                <div
                                  key={j}
                                  className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm"
                                >
                                  <img
                                    src={`https://i.pravatar.cc/150?u=${selectedProjectForView.id + j}`}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))
                            )}
                            {remainingCount > 0 && (
                              <div
                                className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => {
                                  setAllMembersList(projectMembers);
                                  setShowAllMembersModal(true);
                                }}
                                title={`Click to see all ${projectMembers.length} members`}
                              >
                                +{remainingCount}
                              </div>
                            )}
                            {visibleMembers.length === 0 && projectMembers.length === 0 && memberIds.length > 0 && (
                              <div
                                className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => {
                                  setAllMembersList([]);
                                  setShowAllMembersModal(true);
                                }}
                                title={`Click to see all ${memberIds.length} members`}
                              >
                                +{memberIds.length}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Details Section */}
              <div className="border border-slate-100 rounded-[2rem] p-6 md:p-10">
                <h4 className="text-[20px] md:text-[22px] font-Gantari font-bold text-[#1A1A1A] mb-8">
                  Project Details
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Project Name
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.project_name || "Not Specified"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Actual Start Date
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.start_date
                          ? new Date(selectedProjectForView.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Total Project Hours
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.total_hours ? `${selectedProjectForView.total_hours}hrs` : "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Budget
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.budget ? `${selectedProjectForView.budget}$` : "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Total Resources Available
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.resources || "Not Set"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Location
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.location || "Not Specified"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Actual End Date
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.end_date
                          ? new Date(selectedProjectForView.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Hours/Day
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.per_day ? `${selectedProjectForView.per_day}hrs` : "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Total Resources Required
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.required_resources || "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        Required Resources
                      </span>
                      <span className="text-[#999999] mr-4">:</span>
                      <span className="text-[16px] font-Gantari font-bold text-[#666666]">
                        {selectedProjectForView.required_resources || "Not Set"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-12 flex items-center">
                  <span className="w-48 text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                    Project Document
                  </span>
                  <span className="text-[#999999] mr-4">:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] font-Gantari font-bold text-[#999999]">
                      No Document Available
                    </span>
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
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div>
                  <h3 className="text-[26px] font-Gantari font-bold text-[#1A1A1A]">
                    Payment Milestones
                  </h3>
                  <p className="text-[16px] font-Gantari font-bold text-[#999999] mt-0.5">
                    {currentProject.project_name ?? "Prestige Park Grove"}
                    _Tower 1 to 09
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMilestoneModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[16px] shadow-sm hover:bg-[#c93a39] transition-colors"
                title="Add Milestone"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Milestone
              </button>
            </div>

            {/* Milestones Content - No Scroll Version */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-10 pb-10 custom-scrollbar">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-[#DD4342] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-white text-[16px] font-Gantari font-bold opacity-90">
                    Total Amount
                  </p>
                  <p className="text-white text-[32px] font-Gantari font-bold">
                    10,000,00
                  </p>
                </div>
                <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-[#333333] text-[16px] font-Gantari font-bold">
                    Paid Amount
                  </p>
                  <p className="text-[#333333] text-[32px] font-Gantari font-bold">
                    4,000,00
                  </p>
                </div>
                <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-[#333333] text-[16px] font-Gantari font-bold">
                    Pending Amount
                  </p>
                  <p className="text-[#333333] text-[32px] font-Gantari font-bold">
                    6,000,00
                  </p>
                </div>
                <div className="bg-[#F4F5F7] p-6 lg:p-8 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[150px]">
                  <p className="text-[#333333] text-[16px] font-Gantari font-bold">
                    Progress
                  </p>
                  <p className="text-[#333333] text-[32px] font-Gantari font-bold">
                    72%
                  </p>
                </div>
              </div>

              {/* Central Box Area - Now Flexible */}
              <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[2.5rem] bg-white px-24 flex flex-col items-center justify-center text-center">
                <h4 className="text-[22px] font-Gantari font-bold text-[#353535] mb-2">
                  No Payment Milestones Found
                </h4>
                <p className="text-[15px] font-Gantari font-bold text-[#999999] mb-10 max-w-sm">
                  Add your First Payment to get started with payment tracking
                </p>
                <button
                  onClick={() => setShowAddMilestoneModal(true)}
                  className="flex items-center gap-2 px-10 py-4 rounded-xl bg-[#DD4342] text-white font-Gantari font-bold text-[18px] shadow-lg shadow-red-500/10 hover:bg-[#c93a39] transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 4v16m8-8H4"
                    />
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
              <h2 className="text-[24px] font-Gantari font-semibold text-[#000000]">
                {title}
              </h2>
              {/* {canCreate && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 p-2 rounded-[5px] bg-[#DD4342] text-[#F2F2F2] text-[16px] font-Gantari font-semibold"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Project
                  </button>
                )} */}
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
                    // Use data directly from projects table
                    const total = p.total_tasks ?? 0;
                    const completed = p.completed_tasks ?? 0;
                    const progress = Math.round(p.progress ?? 0);

                    // Get members from project.members field (comma-separated string)
                    const memberIds = p.member
                      ? p.member.split(',').map(m => m.trim()).filter(Boolean).map(Number)
                      : [];

                    const radius = 28;
                    const circumference = 2 * Math.PI * radius;
                    const offset =
                      circumference - (progress / 100) * circumference;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-[20px] font-Gantari font-semibold text-[#353535] leading-tight">
                                {p.project_name ?? "Untitled Project"}
                              </h3>
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuProjectId((prev) =>
                                    prev === p.id ? null : p.id,
                                  )
                                }
                                className="rounded-full text-[#8B8B8B] hover:opacity-80"
                              >
                                <img src={Dot} alt="Dot" className="w-6 h-6" />
                              </button>
                              <div
                                className={`absolute -right-40 w-50 bg-white/20 backdrop-blur rounded-[15px] border border-[#59595980] z-20 transition-all duration-200 ${openMenuProjectId === p.id ? "opacity-100 visible" : "opacity-0 invisible"}`}
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuProjectId(null);
                                    setSelectedProjectForView(p);
                                    setShowProjectView(true);
                                  }}
                                  className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                >
                                  <VscEye className="w-5 h-5" />
                                  <span className="text-sm font-semibold text-[#6B6B6B] hover:text-[#DD4342]">
                                    View
                                  </span>
                                </button>
                                {(isTechnicalDirector || isManagement) && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuProjectId(null);
                                      setCurrentProject(p);
                                      setShowMilestones(true);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                  >
                                    <FaCircleDollarToSlot className="w-5 h-5" />
                                    <span className="text-sm font-semibold text-[#6B6B6B] hover:text-[#DD4342]">
                                      Payment Milestones
                                    </span>
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuProjectId(null);
                                      setSelectedProjectForEdit(p);
                                      setCreateName(p.project_name ?? "");
                                      // Show project budget as placeholder, will be overwritten by contract fetch below
                                      setCreateBudget(p.budget ? `${p.budget}` : "Fetching...");
                                      setCreateModuleName(p.module_name ?? "");
                                      setCreateClientName(p.client_name ?? "");
                                      setCreateProjectManager(
                                        p.project_manager ?? "",
                                      );
                                      setCreateStartDate(p.start_date ?? "");
                                      setCreateEndDate(p.end_date ?? "");
                                      setCreateTotalHours(p.total_hours ?? "");
                                      setCreatePerDay(p.per_day ?? "");
                                      setCreateDepartment(
                                        p.department === 'Budget Ceiling' || p.department === 'Submission Deadline'
                                          ? p.department
                                          : '',
                                      );
                                      setCreateBudgetCeiling(p.budget_ceiling ?? "");
                                      // Convert date format if needed
                                      const biddingDate = p.bidding_end_date
                                        ? p.bidding_end_date.includes('T')
                                          ? p.bidding_end_date.split('T')[0]
                                          : p.bidding_end_date
                                        : "";
                                      setCreateBiddingEndDate(biddingDate);
                                      setCreateBIMLead(p.bim_lead ?? "");
                                      setCreateBIMCoOrdinator(
                                        p.bim_co_ordinator ?? "",
                                      );
                                      setCreateMember(p.member ?? "");
                                      setCreateResources(p.resources ?? "");
                                      setCreateRequiredResources(
                                        p.required_resources ?? "",
                                      );
                                      setCreatePriority(p.priority ?? "");
                                      setCreateLocation(p.location ?? "");
                                      setCreateDescription(p.description ?? "");
                                      setShowEditModal(true);
                                      // Auto-fetch client budget from contracts table
                                      if (p.client_id) {
                                        import('../../lib/api').then(({ default: api }) => {
                                          api.get<{ client_budget: number | null }>(`/api/vendors/client-budget?client_id=${p.client_id}`)
                                            .then(({ data }) => {
                                              if (data.client_budget !== null && data.client_budget !== undefined) {
                                                setCreateBudget(String(data.client_budget));
                                              } else {
                                                setCreateBudget(p.budget ? `${p.budget}` : "—");
                                              }
                                            })
                                            .catch(() => setCreateBudget(p.budget ? `${p.budget}` : "—"));
                                        });
                                      }
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                  >
                                    <BiEdit className="w-5 h-5" />
                                    <span className="text-sm font-semibold text-[#6B6B6B] hover:text-[#DD4342]">
                                      Edit
                                    </span>
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuProjectId(null);
                                      setDeleteId(p.id);
                                    }}
                                    className="w-full flex items-center gap-4 px-6 py-2.5 transition-colors text-left hover:text-[#DD4342] font-Gantari"
                                  >
                                    <RiDeleteBin5Fill className="w-5 h-5" />
                                    <span className="text-sm font-semibold text-[#6B6B6B] hover:text-[#DD4342]">
                                      Delete
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mb-8 mt-4">
                            <div className="relative flex items-center justify-center">
                              <svg className="w-20 h-20 transform -rotate-90">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r={radius}
                                  stroke="#f1f5f9"
                                  strokeWidth="6"
                                  fill="transparent"
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r={radius}
                                  stroke="#0a9344"
                                  strokeWidth="6"
                                  fill="transparent"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                  strokeLinecap="round"
                                  style={{
                                    transition: "stroke-dashoffset 0.5s ease",
                                  }}
                                />
                              </svg>
                              <span className="absolute text-base font-Gantari font-bold text-[#353535]">
                                {progress}%
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-baseline mb-2">
                                <span className="text-[15px] font-Gantari font-bold text-[#8B8B8B]">
                                  Tasks Done
                                </span>
                                <span className="text-[15px] font-Gantari font-bold text-[#000000]">
                                  {completed}/
                                  <span className="text-[15px] font-Gantari text-[#8B8B8B] ml-0.5 font-bold">
                                    {total}
                                  </span>
                                </span>
                              </div>
                              <div className="h-2 w-full bg-[#F1F4F9] rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <p className="text-[13px] font-Gantari font-bold text-[#999999] mt-2 tracking-wide">
                                Updated 2h ago
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#F1F1F1] pt-5 mt-auto">
                          <div className="flex -space-x-5">
                            {(() => {
                              // Get employee data for members from projects table
                              // Match by converting both to numbers for comparison
                              const projectEmployees = memberIds
                                .map(id => {
                                  const emp = allEmployees.find(e => Number(e.id) === Number(id));
                                  return emp;
                                })
                                .filter(Boolean) as Employee[];

                              // Show up to 3 members, then +X for remaining
                              const visibleMembers = projectEmployees.slice(0, 3);
                              const remainingCount = Math.max(0, projectEmployees.length - 3);

                              // Helper to get profile picture URL
                              const getProfileImageUrl = (emp: Employee) => {
                                if (emp.profile_picture) {
                                  // If it's already a full URL, use it; otherwise construct it
                                  if (emp.profile_picture.startsWith('http://') || emp.profile_picture.startsWith('https://')) {
                                    return emp.profile_picture;
                                  }
                                  // Construct full URL from relative path
                                  return `${apiBase}/uploads/${emp.profile_picture}`;
                                }
                                return null;
                              };

                              return (
                                <>
                                  {visibleMembers.length > 0 ? (
                                    visibleMembers.map((emp) => {
                                      const profileUrl = getProfileImageUrl(emp);
                                      return (
                                        <div
                                          key={emp.id}
                                          className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                          title={emp.full_name || `Employee ${emp.id}`}
                                          onClick={() => {
                                            setSelectedMember(emp);
                                            setShowMemberProfileModal(true);
                                          }}
                                        >
                                          {profileUrl ? (
                                            <img
                                              src={profileUrl}
                                              alt={emp.full_name || "Member"}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                // Fallback to placeholder if image fails
                                                (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${emp.id}`;
                                              }}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 text-xs font-bold">
                                              {(emp.full_name || `E${emp.id}`).charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    // Fallback: show placeholder avatars if no members found
                                    [1, 2, 3].map((i) => (
                                      <div
                                        key={i}
                                        className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm"
                                      >
                                        <img
                                          src={`https://i.pravatar.cc/150?u=${p.id + i}`}
                                          alt="avatar"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))
                                  )}
                                  {remainingCount > 0 && (
                                    <div
                                      className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                      onClick={() => {
                                        setAllMembersList(projectEmployees);
                                        setShowAllMembersModal(true);
                                      }}
                                      title={`Click to see all ${projectEmployees.length} members`}
                                    >
                                      +{remainingCount}
                                    </div>
                                  )}
                                  {visibleMembers.length === 0 && projectEmployees.length === 0 && memberIds.length > 0 && (
                                    <div
                                      className="w-10 h-10 rounded-full border-2 border-dashed bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
                                      onClick={() => {
                                        setAllMembersList([]);
                                        setShowAllMembersModal(true);
                                      }}
                                      title={`Click to see all ${memberIds.length} members`}
                                    >
                                      +{memberIds.length}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* <Link
                            to={`/projects/${p.id}`}
                            className="flex items-center gap-1.5 text-[16px] font-Gantari font-semibold text-[#8B8B8B] transition-colors group"
                          >
                            Details
                            <svg
                              className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M17 7l-10 10M17 7H7M17 7v10"
                              />
                            </svg>
                          </Link> */}
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
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="absolute left-6 p-2 rounded-lg bg-[#F2F2F2] text-[#000000]"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-semibold text-[#000000]">
                Add New Project
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 custom-scrollbar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCreateError("");
                  setCreateSubmitting(true);
                  api
                    .post<{ success?: boolean; project_id?: number }>(
                      "/api/projects",
                      {
                        project_name: createName.trim(),
                        budget: createBudget || undefined,
                        modules: createModuleName || undefined,
                        client_id: createClientName || undefined,
                        project_manager_id: createProjectManager || undefined,
                        lead_id: createBIMLead || undefined,
                        bim_coordinator_id: createBIMCoOrdinator || undefined,
                        members: createMember || undefined,
                        department: createDepartment || undefined,
                        due_date: createEndDate || undefined,
                        start_date: createStartDate || undefined,
                        totalhours: createTotalHours || undefined,
                        perday: createPerDay || undefined,
                        priority: createPriority || undefined,
                        location: createLocation || undefined,
                        description: createDescription || undefined,
                      },
                    )
                    .then(({ data }) => {
                      if (data.success) {
                        setShowCreateModal(false);
                        setCreateName("");
                        setCreateBudget("");
                        setCreateModuleName("");
                        setCreateClientName("");
                        setCreateProjectManager("");
                        setCreateStartDate("");
                        setCreateEndDate("");
                        setCreateTotalHours("");
                        setCreatePerDay("");
                        setCreateDepartment("");
                        setCreateBudgetCeiling("");
                        setCreateBiddingEndDate("");
                        setCreateBIMLead("");
                        setCreateBIMCoOrdinator("");
                        setCreateMember("");
                        setCreatePriority("");
                        setCreateLocation("");
                        setCreateDescription("");
                        api
                          .get<{ projects?: Record<string, unknown>[] }>(
                            "/api/projects",
                          )
                          .then((res) =>
                            setList(
                              (res.data.projects ?? []).map(
                                mapApiProjectToProject,
                              ),
                            ),
                          )
                          .catch(() => { });
                      }
                    })
                    .catch((err) =>
                      setCreateError(
                        err.response?.data?.message ||
                        "Failed to create project",
                      ),
                    )
                    .finally(() => setCreateSubmitting(false));
                }}
                className="space-y-6"
              >
                {createError && (
                  <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    {createError}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Project Name & Budget */}
                  <div className="space-y-2">
                    <label className="block text-[16px] font-semibold text-[#000000]">
                      Project Name
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Budget
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Module Name
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={createClientName}
                      onChange={(e) => setCreateClientName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Client Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Select Project Manager
                    </label>
                    <div className="relative">
                      <select
                        value={createProjectManager}
                        onChange={(e) =>
                          setCreateProjectManager(e.target.value)
                        }
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select Project Manager</option>
                        <option value="manager1">Manager 1</option>
                        <option value="manager2">Manager 2</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Project Start Date
                    </label>
                    <input
                      type="text"
                      value={createStartDate}
                      onChange={(e) => setCreateStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Project End Date*
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Total Hours*
                    </label>
                    <input
                      type="text"
                      value={createTotalHours}
                      onChange={(e) => setCreateTotalHours(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Total Hours"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Per Day*
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Select Department
                    </label>
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Select BIM Lead
                    </label>
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* BIM Co-ordinator & Member */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Select BIM Co Ordinator
                    </label>
                    <div className="relative">
                      <select
                        value={createBIMCoOrdinator}
                        onChange={(e) =>
                          setCreateBIMCoOrdinator(e.target.value)
                        }
                        className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      >
                        <option value="">Select BIM Co Ordinator</option>
                        <option value="coord1">Co-ordinator 1</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Select Member
                    </label>
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Resources */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Resources
                    </label>
                    <input
                      type="text"
                      value={createResources}
                      onChange={(e) => setCreateResources(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Actual Resources"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Required Resources
                    </label>
                    <input
                      type="text"
                      value={createRequiredResources}
                      onChange={(e) =>
                        setCreateRequiredResources(e.target.value)
                      }
                      className="w-full px-4 py-3 bg-[#F2F3F4] border-none rounded-[5px] transition-all font-medium text-[#000000] placeholder-gray-400"
                      placeholder="Enter Required Resources"
                    />
                  </div>

                  {/* Priority & Location */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Priority
                    </label>
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
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Location
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Project Description*
                    </label>
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
                    <label className="block text-[15px] font-semibold text-[#000000]">
                      Attach File*
                    </label>
                    <div className="flex items-center bg-[#F2F3F4] rounded-[5px] overflow-hidden">
                      <div className="flex-1 px-4 py-3 text-gray-400 font-medium">
                        {createFile ? createFile.name : "Choose File"}
                      </div>
                      <label className="px-6 py-3 bg-gray-200 text-gray-600 font-semibold text-sm cursor-pointer hover:bg-gray-300 transition-colors uppercase tracking-wider">
                        Browse File
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) =>
                            setCreateFile(e.target.files?.[0] || null)
                          }
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
                    {createSubmitting ? "Creating..." : "Submit"}
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Content */}
            <h3 className="text-[28px] font-Gantari font-bold text-[#1A1A1A] mt-4 mb-3">
              Delete Project
            </h3>
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
                onClick={() => {
                  if (deleteId === null) return;
                  api
                    .delete(`/api/projects/${deleteId}`)
                    .then(({ data }) => {
                      if ((data as { success?: boolean }).success) {
                        setList((prev) =>
                          prev.filter((p) => p.id !== deleteId),
                        );
                        setDeleteId(null);
                      }
                    })
                    .catch(() => { });
                }}
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Add Payment Milestone
              </h3>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowAddMilestoneModal(false);
              }}
              className="space-y-6 px-1"
            >
              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Milestone Name*
                </label>
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
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Amount ($)*
                </label>
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
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Due Date*
                </label>
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
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                  Notes
                </label>
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
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-8">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditDropdownOpen(null);
                  setCreateBudgetCeiling("");
                  setCreateBiddingEndDate("");
                  // Reset all form fields
                  setCreateName("");
                  setCreateBudget("");
                  setCreateModuleName("");
                  setCreateClientName("");
                  setCreateProjectManager("");
                  setCreateStartDate("");
                  setCreateEndDate("");
                  setCreateTotalHours("");
                  setCreatePerDay("");
                  setCreateDepartment("");
                  setCreateBIMLead("");
                  setCreateBIMCoOrdinator("");
                  setCreateMember("");
                  setCreateResources("");
                  setCreateRequiredResources("");
                  setCreatePriority("");
                  setCreateLocation("");
                  setCreateDescription("");
                }}
                className="absolute left-10 p-3 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Edit Details
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-10 custom-scrollbar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedProjectForEdit) return;
                  const id = selectedProjectForEdit.id;
                  setIsEditSubmitting(true);
                  api
                    .patch(`/api/projects/${id}`, {
                      project_name: createName.trim(),
                      budget: createBudget || undefined,
                      modules: createModuleName || undefined,
                      client_id: createClientName || undefined,
                      project_manager_id: createProjectManager || undefined,
                      lead_id: createBIMLead || undefined,
                      bim_coordinator_id: createBIMCoOrdinator || undefined,
                      members: createMember || undefined,
                      department: createDepartment || undefined,
                      ...(isEditSourceOutsource
                        ? {
                          budget_ceiling: createBudgetCeiling || undefined,
                          bidding_end_date: createBiddingEndDate || undefined,
                        }
                        : {}),
                      due_date: createEndDate || undefined,
                      start_date: createStartDate || undefined,
                      totalhours: createTotalHours || undefined,
                      perday: createPerDay || undefined,
                      priority: createPriority || undefined,
                      location: createLocation || undefined,
                      description: createDescription || undefined,
                    })
                    .then(({ data }) => {
                      if ((data as { success?: boolean }).success) {
                        setShowEditModal(false);
                        setEditDropdownOpen(null);
                        setCreateBudgetCeiling("");
                        setCreateBiddingEndDate("");
                        // Refresh the project list to get updated data
                        api
                          .get<{ projects?: Record<string, unknown>[] }>(
                            "/api/projects",
                          )
                          .then((res) =>
                            setList(
                              (res.data.projects ?? []).map(
                                mapApiProjectToProject,
                              ),
                            ),
                          )
                          .catch(() => { });
                      }
                    })
                    .catch(() => { })
                    .finally(() => setIsEditSubmitting(false));
                }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {/* Row 1: Project name, Client name */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Project Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Project name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Client Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                      placeholder="Enter Client Name"
                      value={createClientName}
                      onChange={(e) => setCreateClientName(e.target.value)}
                    />
                  </div>

                  {/* Row 2: Client Budget (read-only from contracts), Select source */}
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Client Budget
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] font-Gantari font-medium text-gray-500 cursor-not-allowed"
                      placeholder="Auto-fetched from contract"
                      value={createBudget}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                      Select Source
                    </label>
                    <div className="relative dropdown-container">
                      <button
                        type="button"
                        onClick={() =>
                          setEditDropdownOpen((o) => (o === 'source' ? null : 'source'))
                        }
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                      >
                        <span className={createDepartment === 'Budget Ceiling' || createDepartment === 'Submission Deadline' ? 'text-gray-700' : 'text-gray-400'}>
                          {createDepartment === 'Budget Ceiling' ? 'In House' : createDepartment === 'Submission Deadline' ? 'Outsource' : 'Select Source'}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === 'source' ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {editDropdownOpen === 'source' && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment('');
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${!createDepartment ? 'bg-[#E2EEFF] text-[#1D7AFC]' : 'text-gray-700'
                              }`}
                          >
                            Select Source
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment('Budget Ceiling');
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createDepartment === 'Budget Ceiling' ? 'bg-[#E2EEFF] text-[#1D7AFC]' : 'text-gray-700'
                              }`}
                          >
                            In House
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateDepartment('Submission Deadline');
                              setEditDropdownOpen(null);
                            }}
                            className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createDepartment === 'Submission Deadline' ? 'bg-[#E2EEFF] text-[#1D7AFC]' : 'text-gray-700'
                              }`}
                          >
                            Outsource
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In House: Select Project Manager, BIM Lead, BIM Coordinator */}
                  {isEditSourceInHouse && (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select Project Manager
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() =>
                              setEditDropdownOpen((o) => (o === "pm" ? null : "pm"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                          >
                            <span className={getEmployeeName(createProjectManager) ? "text-gray-700" : "text-gray-400"}>
                              {getEmployeeName(createProjectManager) || "Select Project Manager"}
                            </span>
                            <svg
                              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "pm" ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {editDropdownOpen === "pm" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setCreateProjectManager("");
                                  setEditDropdownOpen(null);
                                }}
                                className="block w-full text-left px-5 py-2.5 text-sm font-Gantari text-gray-700 hover:bg-[#F4F5F7]"
                              >
                                Select Project Manager
                              </button>
                              {projectManagers.map((pm) => (
                                <button
                                  key={pm.id}
                                  type="button"
                                  onClick={() => {
                                    setCreateProjectManager(String(pm.id));
                                    setEditDropdownOpen(null);
                                  }}
                                  className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createProjectManager === String(pm.id)
                                    ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                    : "text-gray-700"
                                    }`}
                                >
                                  {pm.full_name || `Employee ${pm.id}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select BIM Lead
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() =>
                              setEditDropdownOpen((o) => (o === "bimLead" ? null : "bimLead"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                          >
                            <span className={getEmployeeName(createBIMLead) ? "text-gray-700" : "text-gray-400"}>
                              {getEmployeeName(createBIMLead) || "Select BIM Lead"}
                            </span>
                            <svg
                              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "bimLead" ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {editDropdownOpen === "bimLead" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setCreateBIMLead("");
                                  setEditDropdownOpen(null);
                                }}
                                className="block w-full text-left px-5 py-2.5 text-sm font-Gantari text-gray-700 hover:bg-[#F4F5F7]"
                              >
                                Select BIM Lead
                              </button>
                              {bimLeads.map((lead) => (
                                <button
                                  key={lead.id}
                                  type="button"
                                  onClick={() => {
                                    setCreateBIMLead(String(lead.id));
                                    setEditDropdownOpen(null);
                                  }}
                                  className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createBIMLead === String(lead.id)
                                    ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                    : "text-gray-700"
                                    }`}
                                >
                                  {lead.full_name || `Employee ${lead.id}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Select BIM Coordinator
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() =>
                              setEditDropdownOpen((o) => (o === "bimCoord" ? null : "bimCoord"))
                            }
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-left cursor-pointer"
                          >
                            <span className={getEmployeeName(createBIMCoOrdinator) ? "text-gray-700" : "text-gray-400"}>
                              {getEmployeeName(createBIMCoOrdinator) || "Select BIM Coordinator"}
                            </span>
                            <svg
                              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${editDropdownOpen === "bimCoord" ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {editDropdownOpen === "bimCoord" && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-[5px] bg-white border border-slate-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setCreateBIMCoOrdinator("");
                                  setEditDropdownOpen(null);
                                }}
                                className="block w-full text-left px-5 py-2.5 text-sm font-Gantari text-gray-700 hover:bg-[#F4F5F7]"
                              >
                                Select BIM Coordinator
                              </button>
                              {bimCoordinators.map((coord) => (
                                <button
                                  key={coord.id}
                                  type="button"
                                  onClick={() => {
                                    setCreateBIMCoOrdinator(String(coord.id));
                                    setEditDropdownOpen(null);
                                  }}
                                  className={`block w-full text-left px-5 py-2.5 text-sm font-Gantari hover:bg-[#F4F5F7] ${createBIMCoOrdinator === String(coord.id)
                                    ? "bg-[#E2EEFF] text-[#1D7AFC]"
                                    : "text-gray-700"
                                    }`}
                                >
                                  {coord.full_name || `Employee ${coord.id}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Outsource: Outsourcing Budget, Bidding End Date */}
                  {isEditSourceOutsource && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Outsourcing Budget
                        </label>
                        <input
                          type="text"
                          className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                          placeholder="Enter Outsourcing Budget"
                          value={createBudgetCeiling}
                          onChange={(e) => setCreateBudgetCeiling(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-Gantari font-bold text-[#353535]">
                          Bidding End Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-5 py-3.5 bg-[#F4F5F7] border-none rounded-[5px] focus:ring-2 focus:ring-[#DD4342]/10 transition-all font-Gantari font-medium text-gray-700 placeholder-gray-400"
                          value={createBiddingEndDate}
                          onChange={(e) => setCreateBiddingEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditDropdownOpen(null);
                      setCreateBudgetCeiling("");
                      setCreateBiddingEndDate("");
                      // Reset all form fields
                      setCreateName("");
                      setCreateBudget("");
                      setCreateModuleName("");
                      setCreateClientName("");
                      setCreateProjectManager("");
                      setCreateStartDate("");
                      setCreateEndDate("");
                      setCreateTotalHours("");
                      setCreatePerDay("");
                      setCreateDepartment("");
                      setCreateBIMLead("");
                      setCreateBIMCoOrdinator("");
                      setCreateMember("");
                      setCreateResources("");
                      setCreateRequiredResources("");
                      setCreatePriority("");
                      setCreateLocation("");
                      setCreateDescription("");
                    }}
                    className="px-12 py-3 rounded-[5px] bg-[#F1F1F1] text-[#666666] font-Gantari font-bold text-[16px] transition-all hover:bg-gray-200"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="px-12 py-3 rounded-[5px] bg-[#E2EEFF] text-[#1D7AFC] font-Gantari font-bold text-[16px] transition-all hover:bg-[#D5E6FF] shadow-sm"
                  >
                    {isEditSubmitting ? "Updating..." : "Update Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* All Members Modal */}
      {showAllMembersModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setShowAllMembersModal(false)}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                All Members ({allMembersList.length})
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-6 custom-scrollbar">
              {allMembersList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allMembersList.map((emp) => {
                    const profileUrl = emp.profile_picture
                      ? (emp.profile_picture.startsWith('http://') || emp.profile_picture.startsWith('https://'))
                        ? emp.profile_picture
                        : `${apiBase}/uploads/${emp.profile_picture}`
                      : null;

                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedMember(emp);
                          setShowAllMembersModal(false);
                          setShowMemberProfileModal(true);
                        }}
                      >
                        {profileUrl ? (
                          <img
                            src={profileUrl}
                            alt={emp.full_name || "Member"}
                            className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${emp.id}`;
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-600 font-bold text-lg">
                              {(emp.full_name || `E${emp.id}`).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                            {emp.full_name || `Employee ${emp.id}`}
                          </p>
                          {emp.user_role && (
                            <p className="text-[14px] font-Gantari font-bold text-[#999999]">
                              {emp.user_role}
                            </p>
                          )}
                          {emp.email && (
                            <p className="text-[13px] font-Gantari text-[#666666] mt-1">
                              {emp.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-[16px] font-Gantari">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Modal */}
      {showMemberProfileModal && selectedMember && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full flex flex-col">
            {/* Modal Header */}
            <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMemberProfileModal(false);
                  setSelectedMember(null);
                }}
                className="absolute left-10 p-2.5 rounded-[5px] bg-[#F8F9FA] hover:bg-gray-100 text-gray-800 transition-colors"
                title="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
                Member Profile
              </h3>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-8 custom-scrollbar">
              <div className="flex flex-col items-center">
                {selectedMember.profile_picture ? (
                  <img
                    src={
                      selectedMember.profile_picture.startsWith('http://') || selectedMember.profile_picture.startsWith('https://')
                        ? selectedMember.profile_picture
                        : `${apiBase}/uploads/${selectedMember.profile_picture}`
                    }
                    alt={selectedMember.full_name || "Member"}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mb-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://i.pravatar.cc/150?u=${selectedMember.id}`;
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center mb-6">
                    <span className="text-slate-600 font-bold text-3xl">
                      {(selectedMember.full_name || `E${selectedMember.id}`).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="w-full space-y-4">
                  <div>
                    <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Full Name</p>
                    <p className="text-[18px] font-Gantari font-bold text-[#1A1A1A]">
                      {selectedMember.full_name || "Not Available"}
                    </p>
                  </div>

                  {selectedMember.empid && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Employee ID</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.empid}
                      </p>
                    </div>
                  )}

                  {selectedMember.dob && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Date of Birth</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.dob).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  )}

                  {selectedMember.phone_number && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Phone Number</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.phone_number}
                      </p>
                    </div>
                  )}

                  {selectedMember.email && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Email</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.email}
                      </p>
                    </div>
                  )}

                  {selectedMember.user_role && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Role</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.user_role}
                      </p>
                    </div>
                  )}

                  {selectedMember.address && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Address</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.address}
                      </p>
                    </div>
                  )}

                  {selectedMember.department && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Department</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {selectedMember.department}
                      </p>
                    </div>
                  )}

                  {selectedMember.doj && (
                    <div>
                      <p className="text-[14px] font-Gantari font-bold text-[#999999] mb-1">Date of Joining</p>
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A]">
                        {new Date(selectedMember.doj).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
