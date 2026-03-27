import type { Vendor } from "../types";
import { FaDownload } from "react-icons/fa6";
import { Country, State, City } from "country-state-city";
import { useMemo } from "react";
import { api } from "../../../../lib/api";

interface Props {
  vendor: Vendor;
  editable?: boolean;
  onChange?: (patch: Partial<Vendor>) => void;
}

const CompanyDetails = ({ vendor, editable = false, onChange }: Props) => {
  const truncateFileName = (name: string, maxLen = 25) => {
    const lastDot = name.lastIndexOf(".");
    const ext = lastDot !== -1 ? name.slice(lastDot) : "";
    const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
    return base.length > maxLen ? `${base.slice(0, maxLen)}...${ext}` : name;
  };

  const inputClass =
    "w-full bg-[#F2F2F2] border-none px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/30 placeholder:text-[#8B8B8B] placeholder:text-[14px]";
  const readonlyClass =
    "bg-[#F2F2F2] px-4 py-2 rounded-[5px] text-[14px] text-[#353535] font-Gantari min-h-[44px] flex items-center";

  const countries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = useMemo(
    () => countries.find((c) => c.name === vendor.country) ?? null,
    [countries, vendor.country],
  );
  const states = useMemo(() => {
    if (!selectedCountry) return [];
    return State.getStatesOfCountry(selectedCountry.isoCode);
  }, [selectedCountry]);
  const selectedState = useMemo(
    () => states.find((s) => s.name === vendor.state) ?? null,
    [states, vendor.state],
  );
  const cities = useMemo(() => {
    if (!selectedCountry || !selectedState) return [];
    return City.getCitiesOfState(
      selectedCountry.isoCode,
      selectedState.isoCode,
    );
  }, [selectedCountry, selectedState]);

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            Company Name
          </label>
          {editable ? (
            <input
              className={inputClass}
              value={vendor.company_name ?? ""}
              onChange={(e) => onChange?.({ company_name: e.target.value })}
            />
          ) : (
            <div className={readonlyClass}>{vendor.company_name}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            Country Of Registration
          </label>
          {editable ? (
            <select
              className={inputClass}
              value={vendor.country ?? ""}
              onChange={(e) => {
                const nextCountry = e.target.value;
                onChange?.({ country: nextCountry, state: "", city: "" });
              }}
            >
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c.isoCode} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={readonlyClass}>{vendor.country}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            State
          </label>
          {editable ? (
            <select
              className={inputClass}
              value={vendor.state ?? ""}
              onChange={(e) => onChange?.({ state: e.target.value, city: "" })}
              disabled={!selectedCountry}
            >
              <option value="">
                {selectedCountry ? "Select State" : "Select Country first"}
              </option>
              {states.map((s) => (
                <option key={s.isoCode} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={readonlyClass}>{vendor.state}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            City
          </label>
          {editable ? (
            <select
              className={inputClass}
              value={vendor.city ?? ""}
              onChange={(e) => onChange?.({ city: e.target.value })}
              disabled={!selectedCountry || !selectedState}
            >
              <option value="">
                {selectedCountry && selectedState
                  ? "Select City"
                  : "Select State first"}
              </option>
              {cities.map((c) => (
                <option
                  key={`${c.name}-${c.latitude ?? ""}-${c.longitude ?? ""}`}
                  value={c.name}
                >
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={readonlyClass}>{vendor.city}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            Year Of Establishment
          </label>
          {editable ? (
            <input
              className={inputClass}
              value={vendor.year_established ?? ""}
              onChange={(e) => onChange?.({ year_established: e.target.value })}
            />
          ) : (
            <div className={readonlyClass}>{vendor.year_established}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            LinkedIn
          </label>
          {editable ? (
            <input
              className={inputClass}
              value={vendor.linkedin ?? ""}
              onChange={(e) => onChange?.({ linkedin: e.target.value })}
            />
          ) : (
            <div className={`${readonlyClass} truncate`}>{vendor.linkedin}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            Website
          </label>
          {editable ? (
            <input
              className={inputClass}
              value={vendor.website ?? ""}
              onChange={(e) => onChange?.({ website: e.target.value })}
            />
          ) : (
            <div className={`${readonlyClass} truncate`}>{vendor.website}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            Address
          </label>
          {editable ? (
            <input
              className={inputClass}
              value={vendor.address ?? ""}
              onChange={(e) => onChange?.({ address: e.target.value })}
            />
          ) : (
            <div className={readonlyClass}>{vendor.address}</div>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            Trade License Certificate
          </label>
          {vendor.trade_license_file ? (
            <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
              <a
                href={api.defaults.baseURL + `static/uploads/vendors/${vendor.trade_license_file}`}
                target="_blank"
                rel="noopener noreferrer"
                title={vendor.trade_license_file}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                {truncateFileName(vendor.trade_license_file)}
                <FaDownload className="flex-shrink-0" />
              </a>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Not uploaded</span>
          )}
        </div>

        <div>
          <label className="block text-[16px] font-semibold font-Gantari text-[#12141D] mb-2">
            GST Certificate
          </label>
          {vendor.gst_certificate_file ? (
            <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
              <a
                href={`http://localhost:5000/static/uploads/vendors/${vendor.gst_certificate_file}`}
                target="_blank"
                rel="noopener noreferrer"
                title={vendor.gst_certificate_file}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                {truncateFileName(vendor.gst_certificate_file)}
                <FaDownload className="flex-shrink-0" />
              </a>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Not uploaded</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;
