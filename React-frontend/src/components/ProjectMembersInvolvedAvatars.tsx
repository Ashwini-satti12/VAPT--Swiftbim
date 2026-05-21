import ProfileIcon from "../assets/ProductNavbarIcons/Profile.svg";
import { getGlobalProfileUrl } from "../lib/profileHelpers";
import type { PmTeamRosterEntry } from "../utils/projectTeamRoster";

export type ResolvedMemberLike = {
  id: number | string;
  full_name?: string;
  profile_picture?: string;
};

type Props = {
  members: PmTeamRosterEntry[];
  resolveMember: (id: number | string) => ResolvedMemberLike | undefined;
  onMemberClick: (member: ResolvedMemberLike) => void;
  onOpenAll: () => void;
  /** e.g. "vendor" for outsource project team photos */
  profileUserType?: string;
};

export default function ProjectMembersInvolvedAvatars({
  members,
  resolveMember,
  onMemberClick,
  onOpenAll,
  profileUserType,
}: Props) {
  if (members.length === 0) {
    return (
      <p className="text-sm font-Gantari font-bold text-[#999999]">N/A</p>
    );
  }

  const avatar = (entry: PmTeamRosterEntry) => {
    const emp = resolveMember(entry.id);
    if (!emp) return null;
    const url =
      emp.id && emp.profile_picture
        ? getGlobalProfileUrl(emp.id, emp.profile_picture, profileUserType)
        : null;

    return (
      <div key={String(entry.id)} className="relative group shrink-0">
        <div
          role="button"
          tabIndex={0}
          className="relative z-0 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
          onClick={() => onMemberClick(emp)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onMemberClick(emp);
            }
          }}
        >
          {url ? (
            <img
              src={url}
              alt={emp.full_name || entry.full_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = ProfileIcon;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
              {(emp.full_name || entry.full_name || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
          {emp.full_name || entry.full_name}
        </div>
      </div>
    );
  };

  if (members.length === 1) {
    const emp = resolveMember(members[0].id);
    if (!emp) {
      return (
        <p className="text-sm font-Gantari font-bold text-[#999999]">N/A</p>
      );
    }
    const url =
      emp.id && emp.profile_picture
        ? getGlobalProfileUrl(emp.id, emp.profile_picture, profileUserType)
        : null;
    return (
      <div className="flex items-center gap-3">
        <div
          role="button"
          tabIndex={0}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all"
          onClick={() => onMemberClick(emp)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onMemberClick(emp);
            }
          }}
        >
          {url ? (
            <img
              src={url}
              alt={emp.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
              {(emp.full_name || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-sm font-Gantari font-medium text-[#616161] truncate">
          {emp.full_name || members[0].full_name}
        </span>
      </div>
    );
  }

  const visible = members.slice(0, 3);
  const remaining = Math.max(0, members.length - 3);

  return (
    <div className="flex flex-wrap items-center -space-x-4">
      {visible.map((entry) => avatar(entry))}
      {remaining > 0 && (
        <div className="relative group shrink-0">
          <div
            role="button"
            tabIndex={0}
            className="relative z-10 w-9 h-9 md:w-10 md:h-10 min-w-[2.25rem] min-h-[2.25rem] md:min-w-[2.5rem] md:min-h-[2.5rem] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm shrink-0 cursor-pointer hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all select-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenAll();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenAll();
              }
            }}
          >
            +{remaining}
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[60] pointer-events-none">
            Click to see all members
          </div>
        </div>
      )}
    </div>
  );
}
