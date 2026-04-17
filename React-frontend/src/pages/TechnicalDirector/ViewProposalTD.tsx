import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import backIcon from "../../assets/TechnicalDirector/back icon.svg";
import addressIcon from "../../assets/TechnicalDirector/Vector.svg";
import websiteIcon from "../../assets/TechnicalDirector/world-wide-web 1.svg";
import emailIcon from "../../assets/TechnicalDirector/mail icon.svg";

interface PaymentTerm {
  label: string;
  value: string;
}

interface Proposal {
  id: number;
  project_name: string;
  vendor_name: string;
  vendor_email: string;
  bid_amount: number;
  timeline: string;
  status: string;
  reason?: string;
  created_at: string;
  technologies_used?: string | string[];
  payment_terms?: string | PaymentTerm[];
  email_address?: string;
  opportunity_id?: number;
  request_note?: string; // Added missing property
  executive_summary?: string; // Added missing property
  about_us?: string; // Added missing property
  aboutus?: string; // Added missing property
  address?: string; // Added missing property
  website_url?: string; // Added missing property
  scope_of_work?: string; // Added missing property
  deliverables?: string; // Added missing property
  deliverables_intro?: string; // Added missing property
  deliverables_list?: string; // Added missing property
  exclusions?: string; // Added missing property
  exclusions_list?: string; // Added missing property
  // Add other fields as they become relevant
}

function stripHtml(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function safeParse(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === "string") {
        return item;
      } else if (
        typeof item === "object" &&
        item !== null &&
        "module" in item &&
        typeof (item as { module: string }).module === "string"
      ) {
        return (item as { module: string }).module;
      }
      return String(item); // Fallback to string conversion for other types
    });
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            if (typeof item === "string") {
              return item;
            } else if (
              typeof item === "object" &&
              item !== null &&
              "module" in item &&
              typeof (item as { module: string }).module === "string"
            ) {
              return (item as { module: string }).module;
            }
            return String(item); // Fallback to string conversion
          });
        }
        return [];
      } catch {
        return [];
      }
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function safeParsePayment(
  val: string | PaymentTerm[] | undefined,
): PaymentTerm[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              "label" in item &&
              "value" in item,
          )
        ) {
          return parsed as PaymentTerm[];
        }
        return [];
      } catch {
        return [];
      }
    }
  }
  return [];
}

export default function ViewProposalTD() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const state: any = (location && (location as any).state) || {};
    const bid = state?.bid || null;
    const proposalId = state?.proposalId || Number(searchParams.get("proposalId") || 0) || null;
    const source = state?.source || searchParams.get("source") || "td_proposals";
    const returnTo = state?.returnTo || "/td/proposals";

  const [loading, setLoading] = useState(!!proposalId);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [showCreateWorkOrder, setShowCreateWorkOrder] = useState(false);
  const [hasWorkOrder, setHasWorkOrder] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!proposalId) {
      return;
    }

    const path =
      source === "vendor_submitted"
        ? `/api/vendors/td/proposals/${proposalId}`
        : `/api/vendors/proposals/td/${proposalId}`;

    api
      .get<{ proposal?: Proposal }>(path)
      .then(({ data }) => {
        if (isMounted && data.proposal) {
          setProposal(data.proposal);
          // If already accepted, show create workorder button
          if (data.proposal.status?.toLowerCase() === "accepted") {
            setShowCreateWorkOrder(true);
          }
        }
        const isVendorView = location.pathname.startsWith("/v") || returnTo.startsWith("/v");

        const fetchProposal = async () => {
            const candidatePaths =
                source === "vendor_submitted"
                    ? (
                        isVendorView
                            ? [
                                `/api/vendors/proposals/vendor/${proposalId}`,
                                `/api/vendors/td/proposals/${proposalId}`,
                            ]
                            : [
                                `/api/vendors/td/proposals/${proposalId}`,
                                `/api/vendors/proposals/vendor/${proposalId}`,
                            ]
                    )
                    : [`/api/vendors/proposals/td/${proposalId}`];

            for (const path of candidatePaths) {
                try {
                    const { data } = await api.get<{ proposal?: any }>(path);
                    if (data?.proposal) {
                        setProposal(data.proposal);
                        return;
                    }
                } catch {
                    // try next candidate path
                }
            }
            setProposal(null);
        };

        fetchProposal()
            .finally(() => {
                setLoading(false);
            });
    }, [proposalId, source, location.pathname, returnTo]);

    const techs = safeParse(proposal?.technologies_used);
    const payments = safeParsePayment(proposal?.payment_terms);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };
  }, [proposalId, source]);

  useEffect(() => {
    const pId = proposal?.id || bid?.id;
    const pName = (proposal?.project_name || bid?.project_name || "").trim();
    const vName = (proposal?.vendor_name || bid?.vendor_name || "").trim();
    if (!pId && !pName && !vName) {
      setHasWorkOrder(false);
      return;
    }

    api
      .get<{ success?: boolean; work_orders?: any[] }>("/api/workorders")
      .then(({ data }) => {
        const rows = data?.work_orders || [];
        const exists = rows.some((wo: any) => {
          const woPid = Number(wo?.proposal_id || 0);
          const thisPid = Number(pId || 0);
          const byProposal = thisPid > 0 && woPid === thisPid;
          const byName =
            (wo?.project_name || "").trim() === pName &&
            (wo?.vendor_name || "").trim() === vName;
          return byProposal || byName;
        });
        setHasWorkOrder(exists);
      })
      .catch(() => {
        setHasWorkOrder(false);
      });
  }, [proposal, bid]);

  const respond = async (action: "accept" | "reject") => {
    if (!proposalId) return;
    const reason =
      action === "reject" ? (window.prompt("Reason (optional)", "") ?? "") : "";
    try {
      await api.post(`/api/vendors/td/proposals/${proposalId}/respond`, {
        action,
        reason,
      });
      const path =
        source === "vendor_submitted"
          ? `/api/vendors/td/proposals/${proposalId}`
          : `/api/vendors/proposals/td/${proposalId}`;
      const { data } = await api.get<{ proposal?: Proposal }>(path);
      if (data.proposal) {
        setProposal(data.proposal);
        if (action === "accept") {
          setShowCreateWorkOrder(true);
        }
      }
      navigate(location.pathname, {
        replace: true,
        state: { ...state, responded: true, msg: `Proposal ${action}ed.` },
      });
    } catch {
      // ignore
    }
  };

  const techs = safeParse(proposal?.technologies_used);
  const payments = safeParsePayment(proposal?.payment_terms);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "sent" || s === "pending") return "bg-[#FFF8E7] text-[#92400E]";
    if (s === "accepted") return "bg-[#E6F4EA] text-[#1E7E34]";
    if (s === "rejected") return "bg-[#FFF1F2] text-[#BE123C]";
    if (s === "clarification_requested") return "bg-[#EAF0FB] text-[#1967D2]";
    if (s === "expired") return "bg-[#F2F2F2] text-[#616161]";
    return "bg-[#F2F2F2] text-[#616161]";
  };

  const getStatusLabel = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "sent") return "Sent";
    if (s === "pending") return "Pending";
    if (s === "accepted") return "Accepted";
    if (s === "rejected") return "Rejected";
    if (s === "clarification_requested") return "Clarification";
    if (s === "expired") return "Expired";
    return status || "Unknown";
  };

  return (
    <div className=" space-y-4 flex flex-col min-h-full bg-white font-gantari overflow-y-auto w-full pb-10 px-5 py-2">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="group relative inline-flex shrink-0">
          <button
            type="button"
            onClick={() => navigate(returnTo)}
            className="p-2 rounded-md bg-[#F4F4F4] text-[#1A1A1A] transition-all cursor-pointer hover:opacity-90 shrink-0"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] flex flex-col items-center">
            <div className="w-2.5 h-2.5 bg-[#FFFFFF] border-t border-l border-[#C1C1C1] rotate-45 relative z-20 -mb-[5.5px]"></div>
            <div className="bg-[#FFFFFF] border border-[#C1C1C1] rounded-md shadow-[inset_0_0_0_1px_rgba(193,193,193,0.35)] px-2 py-0.5 relative z-10">
              <span className="font-gantari text-[14px] font-semibold text-[#353535] text-center block whitespace-nowrap">
                Go Back
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4">
          <h1 className="text-[24px] font-semibold text-[#000000]">
            View Proposal Details
          </h1>
        </div>

        <div className="shrink-0 min-w-[100px] flex items-center justify-end gap-3">
          {proposal && (proposal.status?.toLowerCase() === "pending" || proposal.status?.toLowerCase() === "sent") && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => respond("accept")}
                className="px-6 py-2 rounded-md flex items-center justify-center text-[14px] font-semibold transition-all bg-[#E1F6EB] text-[#008F22] border border-[#E1F6EB] shadow-sm cursor-pointer hover:bg-[#008F22] hover:text-white"
                title="Accept"
              >
                Accept
              </button>
              <button
                onClick={() => respond("reject")}
                className="px-6 py-2 rounded-md flex items-center justify-center text-[14px] font-semibold transition-all bg-[#FFF1F2] text-[#BE123C] border border-[#FFF1F2] shadow-sm cursor-pointer hover:bg-[#BE123C] hover:text-white"
                title="Reject"
              >
                Reject
              </button>
            </div>
          )}

          {showCreateWorkOrder && (
            <button
              onClick={() =>
                navigate("/td/workorder-form", { state: { proposal } })
              }
              disabled={hasWorkOrder}
              className={`px-4 py-2 rounded-md text-[14px] font-semibold transition-all ${
                hasWorkOrder
                  ? "bg-[#F2F2F2] text-[#8B8B8B] cursor-not-allowed border border-[#AEACAC52]"
                  : "bg-[#DD4342] text-white cursor-pointer"
              }`}
            >
              {hasWorkOrder ? "Work Order Created" : "Create Work Order"}
            </button>
          )}

          {proposal && proposal.status && (
            <span
              className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-[14px] font-bold min-w-[4.5rem] ${getStatusBadge(proposal.status)}`}
            >
              {getStatusLabel(proposal.status)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-10 px-2 min-w-0">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
          </div>
        ) : !proposal ? (
          <div className="py-20 text-center text-[#616161] font-gantari">
            <p className="text-lg font-semibold mb-1 text-[#353535]">
              No proposal found
            </p>
            <p className="text-sm">The proposal details could not be loaded.</p>
          </div>
        ) : (
          <div className="w-full space-y-10 relative">
            {/* Summary Banner — All key info inside the card */}
            <div className="mt-4">
              <div className="bg-[#F2F2F2] border border-[#AEACAC52] rounded-md py-4 sm:py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-4">
                <div className="px-4 sm:px-6 sm:border-r border-[#AEACAC52]">
                  <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
                    Project
                  </p>
                  <p className="text-[#616161] text-sm sm:text-[16px] truncate text-center uppercase tracking-wide">
                    {proposal.project_name || bid?.project_name || "Proposal"}
                  </p>
                </div>
                <div className="px-4 sm:px-6 sm:border-r border-[#AEACAC52]">
                  <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
                    Vendor
                  </p>
                  <p className="text-[#616161] text-sm sm:text-[16px] truncate text-center uppercase tracking-wide">
                    {proposal.vendor_name || bid?.vendor_name || "—"}
                  </p>
                </div>
                <div className="px-4 sm:px-6 lg:border-r border-[#AEACAC52]">
                  <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
                    Email
                  </p>
                  <p className="text-[#616161] text-sm sm:text-[16px] truncate text-center">
                    {proposal.email_address ||
                      proposal.vendor_email ||
                      bid?.vendor_email ||
                      "—"}
                  </p>
                </div>
                <div className="px-4 sm:px-6 sm:border-r border-[#AEACAC52] last:border-r-0">
                  <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
                    Service ID
                  </p>
                  <p className="text-[#616161] text-sm sm:text-[16px] text-center uppercase tracking-wide">
                    {proposal.opportunity_id
                      ? `OPP-${proposal.opportunity_id}`
                      : bid?.opportunity_id
                        ? `OPP-${bid.opportunity_id}`
                        : "—"}
                  </p>
                </div>
                <div className="px-4 sm:px-6 last:border-r-0">
                  <p className="text-base sm:text-[18px] font-bold text-[#020202] mb-1 tracking-wider text-center">
                    Created On
                  </p>
                  <p className="text-[#616161] text-sm sm:text-[16px] text-center">
                    {formatDate(proposal.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {(proposal.reason && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  Vendor Note / Request
                </h2>
                <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-transparent">
                  <p className="text-[14px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">
                    {proposal.reason}
                  </p>
                </div>
              </div>
            )) ||
              (proposal.request_note && (
                <div className="space-y-4">
                  <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                    Clarification Note
                  </h2>
                  <div className="bg-[#F2F2F2] rounded-md px-4 py-3 border border-transparent">
                    <p className="text-[14px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">
                      {proposal.request_note}
                    </p>
                  </div>
                </div>
              ))}

            {/* 1. Executive Summary */}
            {proposal.executive_summary && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  1. Executive Summary
                </h2>
                <div className="bg-[#F2F2F2] rounded-md px-4 py-3">
                  <p className="text-[14px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">
                    {stripHtml(proposal.executive_summary || "")}
                  </p>
                </div>
              </div>
            )}

            {/* 2. About Us */}
            {(proposal.about_us || proposal.aboutus) && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  2. About Us
                </h2>
                <div className="bg-[#F2F2F2] rounded-md px-4 py-3">
                  <p className="text-[14px] text-[#353535] font-gantari leading-relaxed whitespace-pre-line">
                    {stripHtml(proposal.about_us || proposal.aboutus || "")}
                  </p>
                </div>
                {(proposal.address ||
                  proposal.website_url ||
                  proposal.email_address) && (
                  <div className="space-y-4 pt-2 w-full">
                    {proposal.address && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 min-w-0 sm:min-w-[140px] shrink-0">
                          <img src={addressIcon} alt="" className="w-5 h-5" />
                          <div className="flex-1 flex justify-between text-[14px] font-semibold text-[#020202]">
                            <span>Address</span>
                            <span className="hidden sm:inline">:</span>
                          </div>
                        </div>
                        <span className="text-[#616161] font-medium text-[14px] flex-1">
                          {proposal.address}
                        </span>
                      </div>
                    )}
                    {proposal.website_url && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 min-w-0 sm:min-w-[140px] shrink-0">
                          <img src={websiteIcon} alt="" className="w-5 h-5" />
                          <div className="flex-1 flex justify-between text-[14px] font-semibold text-[#020202]">
                            <span>Website</span>
                            <span className="hidden sm:inline">:</span>
                          </div>
                        </div>
                        <a
                          href={
                            proposal.website_url.startsWith("http")
                              ? proposal.website_url
                              : `https://${proposal.website_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[14px] text-[#1967D2] font-gantari font-medium hover:underline flex-1 truncate"
                        >
                          {proposal.website_url}
                        </a>
                      </div>
                    )}
                    {proposal.email_address && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-3 min-w-0 sm:min-w-[140px] shrink-0">
                          <img src={emailIcon} alt="" className="w-5 h-5" />
                          <div className="flex-1 flex justify-between text-[14px] font-semibold text-[#020202]">
                            <span>Email</span>
                            <span className="hidden sm:inline">:</span>
                          </div>
                        </div>
                        <span className="text-[#616161] font-medium text-[14px] flex-1">
                          {proposal.email_address}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Scope of Work */}
            {proposal.scope_of_work && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  3. Scope of Work
                </h2>
                <div
                  className="bg-[#F2F2F2] rounded-md px-4 py-3 text-[14px] text-[#353535] font-gantari leading-relaxed border border-[#AEACAC52] [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-[14px] [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{
                    __html: proposal.scope_of_work || "",
                  }}
                />
              </div>
            )}

            {/* Technology Table */}
            {techs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  Technology to be Used
                </h2>
                <div className="bg-[#F2F2F2] rounded-md overflow-x-auto border border-[#AEACAC52]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F2F2F2]">
                        <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-[#020202] text-sm">
                          Sl.No
                        </th>
                        <th className="px-4 py-3 text-left font-gantari font-bold text-[#020202] text-sm">
                          Software
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {techs.map((t: string, i: number) => (
                        <tr
                          key={i}
                          className={`${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} border-t border-gray-100`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-gantari text-[14px] text-[#020202]">
                              {i + 1}.
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-gantari text-[14px] text-[#353535]">
                              {t}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Deliverables */}
            {(proposal.deliverables ||
              proposal.deliverables_intro ||
              proposal.deliverables_list) && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  4. Deliverables
                </h2>
                <div
                  className="bg-[#F2F2F2] rounded-md px-4 py-3 text-[14px] text-[#353535] font-gantari leading-relaxed border border-[#AEACAC52] [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-[14px] [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{
                    __html:
                      proposal.deliverables ||
                      proposal.deliverables_intro ||
                      proposal.deliverables_list ||
                      "",
                  }}
                />
              </div>
            )}

            {/* 5. Exclusions */}
            {(proposal.exclusions || proposal.exclusions_list) &&
              stripHtml(
                (proposal.exclusions || proposal.exclusions_list) as string,
              ) && (
                <div className="space-y-4">
                  <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                    5. Exclusions
                  </h2>
                  <div
                    className="bg-[#F2F2F2] rounded-md px-4 py-3 text-[14px] text-[#353535] font-gantari leading-relaxed border border-[#AEACAC52] [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-[14px] [&_h3]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{
                      __html:
                        proposal.exclusions || proposal.exclusions_list || "",
                    }}
                  />
                </div>
              )}

            {/* 6. Payment Terms */}
            {payments.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-gantari font-bold text-[16px] text-[#020202]">
                  6. Payment Terms
                </h2>
                <div className="bg-[#F2F2F2] rounded-md overflow-x-auto border border-[#AEACAC52]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F2F2F2] border-b border-[#AEACAC52]">
                        <th className="px-4 py-3 text-left w-16 font-gantari font-bold text-[#020202] text-[16px]">
                          Sl.No
                        </th>
                        <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-[16px]">
                          Payment Basis
                        </th>
                        <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-[16px]">
                          Terms
                        </th>
                        <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-[16px]">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-center font-gantari font-bold text-[#020202] text-[16px]">
                          Timeline (Weeks)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(
                        (
                          p: PaymentTerm & {
                            basis?: string;
                            terms?: string;
                            amount?: number | string;
                            timeline?: string;
                          },
                          i: number,
                        ) => (
                          <tr
                            key={i}
                            className={`${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} border-t border-gray-100`}
                          >
                            <td className="px-4 py-3 font-gantari text-[14px] text-[#020202]">
                              {i + 1}.
                            </td>
                            <td className="px-4 py-3 text-center font-gantari text-[14px] text-[#353535]">
                              {p.basis || "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-gantari text-[14px] text-[#353535]">
                              {p.terms || "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-gantari text-[14px] text-[#353535]">
                              {p.amount != null &&
                              String(p.amount).trim() !== ""
                                ? String(p.amount)
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-center font-gantari text-[14px] text-[#353535]">
                              {p.timeline || "—"}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
