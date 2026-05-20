import closeBtnIcon from "../assets/ProductNavbarIcons/close button.svg";
import ProfileIcon from "../assets/ProductNavbarIcons/Profile.svg";
import { getGlobalProfileUrl } from "../lib/profileHelpers";
import type { PmTeamRosterEntry } from "../utils/projectTeamRoster";

type Props = {
  open: boolean;
  members: PmTeamRosterEntry[];
  onClose: () => void;
  onMemberClick?: (member: PmTeamRosterEntry) => void;
  /** e.g. "vendor" for vendor portal profile URLs */
  profileUserType?: string;
};

export default function ProjectAllMembersModal({
  open,
  members,
  onClose,
  onMemberClick,
  profileUserType,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="relative flex items-center justify-center px-10 py-6 border-b border-slate-100">
          <div className="absolute left-4 group inline-flex shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-[5px] bg-[#F2F2F2] transition-colors cursor-pointer"
            >
              <img src={closeBtnIcon} alt="Close" className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-[24px] font-Gantari font-bold text-[#1A1A1A]">
            All Members ({members.length})
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 py-6 custom-scrollbar">
          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {members.map((emp, idx) => {
                const profileUrl =
                  emp.id && emp.profile_picture
                    ? getGlobalProfileUrl(emp.id, emp.profile_picture, profileUserType)
                    : null;

                return (
                  <div
                    key={emp.id ? String(emp.id) : `roster-${idx}`}
                    className={`flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors ${onMemberClick ? "cursor-pointer" : ""}`}
                    onClick={() => onMemberClick?.(emp)}
                  >
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt={emp.full_name}
                        className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ProfileIcon;
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-slate-600 font-bold text-lg">
                          {(emp.full_name || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-Gantari font-bold text-[#1A1A1A] truncate">
                        {emp.full_name}
                      </p>
                      {emp.user_role && (
                        <p className="text-[14px] font-Gantari font-bold text-[#999999] truncate">
                          {emp.user_role}
                        </p>
                      )}
                      {emp.email && (
                        <p className="text-[13px] font-Gantari text-[#666666] mt-1 truncate">
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
  );
}
