import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import viewIcon from "../../assets/ProjectManager/project/viewIcon.svg";
import ArrowDown from "../../assets/TechnicalDirector/ep_arrow-down-bold.svg";
import api from "../../lib/api";

interface WorkOrder {
  id: number;
  proposal_id?: number;
  project_name: string;
  vendor_name: string;
  bid_amount: string;
  currency?: string;
  amount_aed?: number;
  timeline: string;
  status: string;
  vendor_address?: string;
  po_date?: string;
  po_number?: string;
  project_location?: string;
  work_description?: string;
  scope_of_work?: string;
  project_involves?: string;
  deliverables?: string;
  terms_and_conditions?: string;
  payment_terms?: string;
  additional_terms?: string;
}

const SHOW_ENTRIES_OPTIONS = [
  { value: "1-10", label: "1-10", start: 0, end: 10 },
  { value: "11-20", label: "11-20", start: 10, end: 20 },
  { value: "21-30", label: "21-30", start: 20, end: 30 },
  { value: "31-40", label: "31-40", start: 30, end: 40 },
  { value: "all", label: "All", start: 0, end: null as number | null },
];

function HeaderDropdown({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || placeholder;

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className || "w-full"}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-[#E8E8E8] rounded-md text-[14px] font-semibold outline-none font-gantari transition-all cursor-pointer border-0 min-w-0"
      >
        <span
          className={`${value ? "text-[#353535]" : "text-[#8B8B8B]"} truncate`}
        >
          {selectedLabel}
        </span>
        <img
          src={ArrowDown}
          alt=""
          className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[#FFFFFF] border border-[#E0E0E0] rounded-[10px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={`${placeholder}-${opt.value}-${opt.label}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-[14px] font-gantari transition-colors cursor-pointer ${
                    selected
                      ? "text-[#353535] bg-[#F2F2F2]"
                      : "text-[#8B8B8B] hover:text-[#353535] hover:bg-[#F2F2F2]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkorderV() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || "";
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [selectedShowEntries, setSelectedShowEntries] = useState("");
  const SHOW_ENTRIES_PLACEHOLDER = "Show Entries";

  useEffect(() => {
    api
      .get<{ success?: boolean; work_orders?: Record<string, unknown>[] }>(
        "/api/workorders",
      )
      .then((res) => {
        const rows = res.data?.work_orders || [];
        const asStr = (v: unknown) => (v == null ? "" : String(v));
        const asNum = (v: unknown) =>
          typeof v === "number" ? v : Number(v || 0);
        const mapped: WorkOrder[] = rows.map((r) => ({
          id: asNum(r.id),
          proposal_id:
            r.proposal_id == null ? undefined : asNum(r.proposal_id),
          project_name: asStr(r.project_name),
          vendor_name: asStr(r.vendor_name),
          bid_amount: `${asStr(r.currency) || "AED"} ${asStr(r.amount_aed) || "0"}`,
          currency: asStr(r.currency) || "AED",
          amount_aed: asNum(r.amount_aed),
          timeline: asStr(r.duration) || "TBD",
          status: asStr(r.status) || "Created",
          vendor_address: asStr(r.vendor_address) || undefined,
          po_date: asStr(r.po_date) || undefined,
          po_number: asStr(r.po_number) || undefined,
          project_location: asStr(r.project_location) || undefined,
          work_description: asStr(r.work_description) || undefined,
          scope_of_work: asStr(r.scope_of_work) || undefined,
          project_involves: asStr(r.project_involves) || undefined,
          deliverables: asStr(r.deliverables) || undefined,
          terms_and_conditions: asStr(r.terms_and_conditions) || undefined,
          payment_terms: asStr(r.payment_terms) || undefined,
          additional_terms: asStr(r.additional_terms) || undefined,
        }));
        setWorkOrders(mapped);
      })
      .catch((err) => {
        console.error("Failed to load work orders", err);
        setWorkOrders([]);
      });
  }, []);

  const projectNames = useMemo(
    () =>
      Array.from(
        new Set(
          workOrders
            .map((w) => (w.project_name || "").trim())
            .filter((x) => x.length > 0),
        ),
      ),
    [workOrders],
  );

  const vendorNames = useMemo(
    () =>
      Array.from(
        new Set(
          workOrders
            .map((w) => (w.vendor_name || "").trim())
            .filter((x) => x.length > 0),
        ),
      ),
    [workOrders],
  );

  const filteredWorkOrders = useMemo(
    () =>
      workOrders.filter((w) => {
        const matchProject = !projectFilter || w.project_name === projectFilter;
        const matchVendor = !vendorFilter || w.vendor_name === vendorFilter;
        return matchProject && matchVendor;
      }),
    [workOrders, projectFilter, vendorFilter],
  );

  const selectedRange =
    SHOW_ENTRIES_OPTIONS.find((o) => o.value === selectedShowEntries) ||
    SHOW_ENTRIES_OPTIONS[0];

  const displayedWorkOrders =
    selectedShowEntries === "all" || !selectedShowEntries
      ? filteredWorkOrders
      : filteredWorkOrders.slice(
          selectedRange.start,
          selectedRange.end ?? undefined,
        );

  const projectFilterOptions = useMemo(
    () => [
      { label: "Project Name", value: "" },
      ...projectNames.map((name) => ({ label: name, value: name })),
    ],
    [projectNames],
  );
  const vendorFilterOptions = useMemo(
    () => [
      { label: "Vendor Name", value: "" },
      ...vendorNames.map((name) => ({ label: name, value: name })),
    ],
    [vendorNames],
  );
  const showEntryFilterOptions = useMemo(
    () => [
      { label: SHOW_ENTRIES_PLACEHOLDER, value: "" },
      ...SHOW_ENTRIES_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
    ],
    [],
  );

  return (
    <div className="px-1 pt-1 pb-0 space-y-8 flex flex-col h-full bg-white font-Gantari relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 px-4 py-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#000000]">
          Work Orders
        </h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <HeaderDropdown
            value={projectFilter}
            onChange={setProjectFilter}
            placeholder="Project Name"
            options={projectFilterOptions}
            className="w-full sm:w-[180px]"
          />
          <HeaderDropdown
            value={vendorFilter}
            onChange={setVendorFilter}
            placeholder="Vendor Name"
            options={vendorFilterOptions}
            className="w-full sm:w-[180px]"
          />
          <HeaderDropdown
            value={selectedShowEntries}
            onChange={setSelectedShowEntries}
            placeholder="Show Entries"
            options={showEntryFilterOptions}
            className="w-full sm:w-[150px]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#AEACAC52] shadow-sm overflow-hidden mx-2 mb-2 sm:mx-0 sm:mb-0">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-white border-b border-[#AEACAC52]">
              <tr>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Sl.No
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Project Name
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Vendor Name
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Amount
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Timeline
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Status
                </th>
                <th className="px-3 py-4 text-center text-[16px] font-semibold text-[#353535]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedWorkOrders.length > 0 ? (
                displayedWorkOrders.map((wo, index) => (
                  <tr
                    key={wo.id}
                    className={index % 2 === 1 ? "bg-[#F2F2F2]" : "bg-white"}
                  >
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.project_name}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.vendor_name}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.bid_amount}
                    </td>
                    <td className="px-3 py-6 text-center text-[14px] text-[#353535]">
                      {wo.timeline}
                    </td>
                    <td className="px-3 py-6 text-center">
                      <span className={`inline-flex px-4 py-1.5 rounded-lg text-[14px] font-semibold ${
                        wo.status === "Accepted" ? "bg-[#E6F4EA] text-[#1E8E3E]" :
                        wo.status === "Rejected" ? "bg-[#FCE8E6] text-[#D93025]" :
                        "bg-[#EAF0FB] text-[#1967D2]"
                      }`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-3 py-6 text-center">
                      <button 
                        onClick={() => navigate("/v/view-workorder", { state: { selectedWO: wo } })}
                        className="flex items-center justify-center gap-2 px-4 py-2 mx-auto rounded-md text-[14px] bg-[#DD4342] text-white cursor-pointer hover:opacity-90"
                      >
                        <img
                          src={viewIcon}
                          alt=""
                          className="w-4 h-4 brightness-0 invert"
                        />
                        View
                      </button>
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-[#616161]">
                      No Work Orders available.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
