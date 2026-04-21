import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Vendor PM proposals are handled on the shared vendor route.
 */
export default function ProposalsPMV() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/v/proposals", { replace: true });
  }, [navigate]);

  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
    </div>
  );
}
