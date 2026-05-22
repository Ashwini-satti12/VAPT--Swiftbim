import ProfileIcon from "../assets/ProductNavbarIcons/Profile.svg";
import { getRosterProfileUrl } from "../lib/profileHelpers";
import type { PmTeamRosterEntry } from "../utils/projectTeamRoster";

type Props = {
  roster: PmTeamRosterEntry[];
  onOpenAll: () => void;
  onMemberClick?: (member: PmTeamRosterEntry) => void;
  avatarClassName?: string;
  /** e.g. "vendor" for vendor portal profile URLs */
  profileUserType?: string;
};

export default function ProjectCardTeamAvatars({
  roster,
  onOpenAll,
  onMemberClick,
  avatarClassName = "w-9 h-9",
  profileUserType,
}: Props) {
  const visible = roster.slice(0, 3);
  const remaining = Math.max(0, roster.length - 3);

  const openAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenAll();
  };

  if (roster.length === 0) {
    return (
      <div
        className={`${avatarClassName} rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 cursor-pointer`}
        onClick={openAll}
      >
        —
      </div>
    );
  }

  return (
    <>
      {visible.map((emp) => {
        const profileUrl = getRosterProfileUrl(emp, profileUserType);
        return (
          <div
            key={emp.id ? String(emp.id) : emp.full_name}
            className={`${avatarClassName} rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-[#DD4342]/20 transition-all relative z-0`}
            title={emp.full_name}
            onClick={(e) => {
              e.stopPropagation();
              if (onMemberClick) onMemberClick(emp);
              else onOpenAll();
            }}
          >
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={emp.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = ProfileIcon;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-300 text-[10px] font-bold text-slate-600">
                {(emp.full_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <div
          className={`${avatarClassName} rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-500 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors relative z-10`}
          onClick={openAll}
        >
          +{remaining}
        </div>
      )}
    </>
  );
}
