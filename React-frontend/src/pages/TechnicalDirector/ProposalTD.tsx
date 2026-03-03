import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface ServiceRequest {
  id: string;
  siNo: string;
  serviceId: string;
  serviceName: string;
  category: string;
  vendorName: string;
  vendorStatus: string;
  companyName: string;
  proposalCreated?: boolean;
}

const DUMMY_SERVICE_REQUESTS: ServiceRequest[] = [
  { id: "1", siNo: "01", serviceId: "INV-001", serviceName: "BIM Modeling", category: "Architecture", vendorName: "John Smith", vendorStatus: "Confirmed", companyName: "ABC Construction", proposalCreated: false },
  { id: "2", siNo: "02", serviceId: "INV-002", serviceName: "Clash Detection", category: "MEP", vendorName: "Sarah Johnson", vendorStatus: "Under Review", companyName: "XYZ Developers", proposalCreated: false },
  { id: "3", siNo: "03", serviceId: "INV-003", serviceName: "4D/5D Simulation", category: "Structural", vendorName: "Michael Brown", vendorStatus: "Confirmed", companyName: "Gulf Engineering", proposalCreated: true },
  { id: "4", siNo: "04", serviceId: "INV-004", serviceName: "As-Built Drawings", category: "Architecture", vendorName: "Emily Davis", vendorStatus: "Under Review", companyName: "Delta Projects", proposalCreated: false },
  { id: "5", siNo: "05", serviceId: "INV-005", serviceName: "Quantity Takeoff", category: "MEP", vendorName: "David Wilson", vendorStatus: "Not Confirmed", companyName: "Prime Builders", proposalCreated: false },
  { id: "6", siNo: "06", serviceId: "INV-006", serviceName: "BIM Coordination", category: "Structural", vendorName: "Lisa Anderson", vendorStatus: "Confirmed", companyName: "Skyline Contractors", proposalCreated: false },
];

export default function ProposalTD() {
  const navigate = useNavigate();
  const [serviceRequests] = useState<ServiceRequest[]>(DUMMY_SERVICE_REQUESTS);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const showOptions = [10, 20, 50, 100];
  const categories = Array.from(new Set(serviceRequests.map((r) => r.category))).sort();

  const filteredRequests = selectedCategory === "All"
    ? serviceRequests
    : serviceRequests.filter((r) => r.category === selectedCategory);

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, itemsPerPage]);

  return (
    <div className="w-full">
      {/* <div className="bg-white border border-[rgb(89,89,89)]/20 rounded-xl shadow-sm p-8 w-full"> */}
        {/* Title and filters row */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-gantari font-semibold text-lg text-[#000000]">
            List of Service Requests
          </h2>
          <div className="flex gap-4 items-center">
            {/* Discipline dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setCategoryDropdownOpen(!categoryDropdownOpen);
                  setShowDropdownOpen(false);
                }}
                className="bg-[#E8E8E8] rounded-lg px-4 py-2 flex items-center gap-2 font-gantari text-sm text-[#353535] font-medium focus:outline-none"
              >
                <span>Discipline: {selectedCategory}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-[rgb(89,89,89)]/20 rounded-lg shadow-lg z-50 min-w-[160px]">
                  <div
                    onClick={() => { setSelectedCategory("All"); setCategoryDropdownOpen(false); }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer font-gantari text-sm text-[#353535]"
                  >
                    All
                  </div>
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setCategoryDropdownOpen(false); }}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer font-gantari text-sm text-[#353535]"
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Show dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDropdownOpen(!showDropdownOpen);
                  setCategoryDropdownOpen(false);
                }}
                className="bg-[#E8E8E8] rounded-lg px-4 py-2 flex items-center gap-2 font-gantari text-sm text-[#353535] font-medium focus:outline-none"
              >
                <span>Show: {itemsPerPage}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${showDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {showDropdownOpen && (
                <div className="absolute top-full mt-1 right-0 bg-white border border-[rgb(89,89,89)]/20 rounded-lg shadow-lg z-50 min-w-[100px]">
                  {showOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => { setItemsPerPage(option); setCurrentPage(1); setShowDropdownOpen(false); }}
                      className="px-4 py-2 text-center hover:bg-gray-100 cursor-pointer font-gantari text-sm text-[#353535]"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table with vertical scroll only */}
        <div className="border border-[rgb(89,89,89)]/20 rounded-lg overflow-hidden">
          <div className="overflow-y-auto overflow-x-auto max-h-[60vh]">
            <table className="w-full min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-[#F2F2F2] border-b border-[rgb(89,89,89)]/20 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">S.No</th>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">Service Id</th>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">BIM Services</th>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">Discipline</th>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">Vendor Name</th>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">Vendor Status</th>
                <th className="px-4 py-4 text-center text-sm font-gantari font-bold text-[#353535] tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(89,89,89)]/10 bg-white">
              {paginatedRequests.map((request, index) => (
                <tr
                  key={request.id}
                  className={`${index % 2 === 1 ? "bg-[#F9FAFB]" : "bg-white"} hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-4 py-4 font-gantari text-sm text-[#353535] text-center">{startIndex + index + 1}</td>
                  <td className="px-4 py-4 font-gantari text-sm text-[#353535] text-center">{request.serviceId}</td>
                  <td className="px-4 py-4 font-gantari text-sm text-[#353535] text-center">{request.serviceName}</td>
                  <td className="px-4 py-4 font-gantari text-sm text-[#353535] text-center">{request.category}</td>
                  <td className="px-4 py-4 font-gantari text-sm text-[#353535] text-center">{request.vendorName}</td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1.5 rounded-md text-xs font-gantari font-medium ${
                        request.vendorStatus === "Confirmed"
                          ? "bg-[#E1F6EB] text-[#008F22]"
                          : request.vendorStatus === "Under Review" || request.vendorStatus === "Not Confirmed"
                            ? "bg-[#FFD9D9] text-[#E00100]"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {request.vendorStatus === "Not Confirmed" ? "Under Review" : request.vendorStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        disabled={request.proposalCreated}
                        onClick={() => {
                          if (request.proposalCreated) return;
                          navigate("/td/create-proposal", {
                            state: {
                              serviceId: request.serviceId,
                              serviceName: request.serviceName,
                              clientName: request.vendorName,
                              category: request.category,
                              companyName: request.companyName,
                              request,
                            },
                          });
                        }}
                        className={`font-gantari font-medium px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-xs transition-colors ${
                          request.proposalCreated
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-[#DD4342] text-white hover:bg-[#c93b3a] cursor-pointer"
                        }`}
                      >
                        {request.proposalCreated ? (
                          <>
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Proposal Created</span>
                          </>
                        ) : (
                          <>
                            <span>+</span>
                            <span>Create Proposal</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end mt-4 gap-4 bg-[#E8E8E8] w-fit ml-auto rounded-lg px-4 py-2">
            <span className="font-gantari text-sm text-[#353535] font-medium">Showing:</span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 font-gantari text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed text-[#353535] hover:text-black"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const rangeStart = (p - 1) * itemsPerPage + 1;
                const rangeEnd = Math.min(p * itemsPerPage, totalItems);
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1 rounded-md text-xs font-gantari font-medium ${
                      currentPage === p ? "bg-[#DD4342] text-white" : "text-[#353535] hover:bg-gray-200"
                    }`}
                  >
                    {rangeStart}-{rangeEnd}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 font-gantari text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed text-[#353535] hover:text-black"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      {/* </div> */}

      {/* Click outside to close dropdowns */}
      {(categoryDropdownOpen || showDropdownOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setCategoryDropdownOpen(false);
            setShowDropdownOpen(false);
          }}
        />
      )}
    </div>
  );
}
