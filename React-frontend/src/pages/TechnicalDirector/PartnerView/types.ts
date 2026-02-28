export interface Vendor {
    id: number;
    company_name: string;
    partner_name?: string;
    email?: string;
    phone?: string;
    status: string;
    created_at: string;

    // Company Details
    country: string;
    state: string;
    city: string;
    year_established: string;
    address: string;
    website: string;
    linkedin: string;
    trade_license_file: string | null;
    gst_certificate_file: string | null;
    nda_agreement_file: string | null;

    // Contact Person
    contact_name: string;
    contact_designation: string;
    contact_email: string;
    contact_mobile: string;
    alternate_contact: string;

    // Company Overview
    num_employees: string;
    turnover_range: string;
    core_business_areas: string;
    technical_team_size: string;
    description: string;

    // Sectors & Services
    sectors: string | string[]; // Can be JSON string or parsed array
    service_categories: string | string[];
    other_sector: string;
    other_service: string;

    // Software
    software_tools: string | string[];
    other_software: string;

    // Resources
    resource_profiles: ResourceProfile[];

    // Portfolio (multiple projects)
    portfolio_projects: PortfolioProject[];

    // Certificates
    certifications: string | string[]; // path or json array of paths

    // Financial & Legal
    billing_currency: string;
    payment_terms: string;
    nda_agreed: boolean | number;
    data_protection_compliant: boolean | number;
}

export interface ResourceProfile {
    id?: number;
    name: string;
    designation: string;
    discipline: string;
    years_of_experience: string;
    expertise: string;
    certifications: string;
    software: string;
    role: string;
    projects_worked_on: string;
}

export interface PortfolioProject {
    id?: number;
    vendor_id?: number;
    project_name: string;
    project_client: string;
    project_sector: string;
    project_description: string;
    project_role: string;
    project_tools: string;
    project_duration: string;
    project_year: string;
    project_files: string[] | string | null;
    created_at?: string;
}
