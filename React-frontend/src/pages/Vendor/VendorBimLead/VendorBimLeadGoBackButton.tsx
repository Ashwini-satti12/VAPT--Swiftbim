import type { ReactNode } from "react";

type VendorBimLeadBackTooltipWrapProps = {
  children: ReactNode;
};

/**
 * Wraps your existing back control (e.g. &lt;button&gt;&lt;img src={backIcon} /&gt;&lt;/button&gt;)
 * with the “Go Back” tooltip on hover/focus.
 */
export function VendorBimLeadBackTooltipWrap({
  children,
}: VendorBimLeadBackTooltipWrapProps) {
  return (
    <div className="group relative inline-flex shrink-0">
      {children}
      <div
        className="pointer-events-none absolute left-1/2 top-full z-[300] mt-2 -translate-x-1/2 flex flex-col items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        <div
          className="z-[1] -mb-px h-2 w-2 rotate-45 border border-[#DCDCDC] border-b-0 border-r-0 bg-white"
          aria-hidden
        />
        <div className="relative rounded-lg border border-[#DCDCDC] bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <span className="whitespace-nowrap font-gantari text-[13px] font-bold text-[#1A1A1A]">
            Go Back
          </span>
        </div>
      </div>
    </div>
  );
}
