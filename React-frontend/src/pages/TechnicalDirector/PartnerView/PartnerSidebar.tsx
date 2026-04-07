interface PartnerSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const PartnerSidebar = ({ activeTab, setActiveTab }: PartnerSidebarProps) => {
    const tabs = [
        { key: "Company Details", label: "Company Details" },
        { key: "Contact Person", label: "Contact Person" },
        { key: "Company Overview", label: "Company Overview" },
        { key: "Sector, Service & Software", label: <>Sector, Service <br /> & Software</> },
        { key: "Resources", label: "Resources" },
        { key: "Protfolio & Project", label: "Protfolio & Project" },
        { key: "Certificates", label: "Certificates" }
    ];

    return (
        <div className="flex flex-row md:flex-col gap-4 md:gap-6 h-full bg-[#E9E9E93B] md:bg-[#E9E9E93B] text-center pt-2 md:pt-10 py-4 px-2 md:px-0 overflow-x-auto md:overflow-x-visible custom-scrollbar scroll-smooth shrink-0">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 md:px-4 font-sora text-[14px] md:text-base justify-center text-center h-auto leading-tight cursor-pointer whitespace-nowrap md:whitespace-normal shrink-0 md:shrink ${activeTab === tab.key
                        ? "text-[#DD4342] font-bold"
                        : "text-[#333333] font-medium"
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default PartnerSidebar;
