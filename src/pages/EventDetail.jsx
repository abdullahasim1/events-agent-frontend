import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, ExternalLink, ChevronDown, Calendar, Check } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { updateEventApi } from "../services/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const formatLongDate = (dateStr) => {
  if (!dateStr || dateStr === "TBA" || String(dateStr).includes("Check link"))
    return dateStr || "TBA";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match
    ? `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`
    : dateStr;
};

// 🏷️ Saved Indicator Badge
const SavedBadge = ({ show }) => {
  if (!show) return null;
  return (
    <span className="text-[10px] font-semibold text-[#2d563c] bg-[#eef6f0] px-1.5 py-0.5 rounded inline-flex items-center gap-1 select-none shadow-[0_1px_2px_rgba(0,0,0,0.04)] animate-in fade-in">
      <Check className="w-2.5 h-2.5 text-[#2d563c]" strokeWidth={2.5} />
      Saved
    </span>
  );
};

// 📦 Reusable card
const DetailCard = ({ title, children }) => (
  <div className="w-full bg-white rounded-[14px] p-6 shadow-[0_0_2.5px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(8,8,8,0.04)]">
    <h2 className="text-[13.5px] font-bold text-[#080808] mb-5 tracking-tight">
      {title}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-5 gap-x-8">
      {children}
    </div>
  </div>
);

// 🏷️ Info Field Wrapper
const InfoField = ({ label, value, showSaved, className = "", children }) => (
  <div className={`flex flex-col ${className}`}>
    <div className="flex items-center justify-between mb-1.5 min-h-[16px]">
      <span className="text-[11px] font-normal text-[rgba(68,67,67,0.78)]">
        {label}
      </span>
      {showSaved && <SavedBadge show={true} />}
    </div>
    {children || (
      <p className="text-[12.5px] font-bold text-[#080808] leading-snug break-words">
        {value || "-"}
      </p>
    )}
  </div>
);

// ✏️ Input Box (Tick icon appears ONLY when value is changed or cleared)
const InputBox = ({ value, onChange, placeholder = "-" }) => {
  const initialText = value === "-" ? "" : (value || "");
  const [val, setVal] = useState(initialText);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setVal(value === "-" ? "" : (value || ""));
  }, [value]);

  const isDirty = val !== initialText;

  const handleSave = () => {
    const trimmed = val.trim();
    const finalVal = trimmed === "" ? "-" : trimmed;
    onChange(finalVal);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="relative w-full flex items-center">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        className={`w-full bg-white border rounded-[8px] pl-3.5 pr-8 py-2 text-[12.5px] font-medium text-[#080808] placeholder:text-gray-400 focus:outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
          isDirty ? "border-[#558066] ring-1 ring-[#558066]" : "border-[#e2e2e2] hover:border-gray-300"
        }`}
      />

      {(isDirty || justSaved) && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleSave();
          }}
          title="Save changes"
          className="absolute right-2 p-1 rounded-md transition-all cursor-pointer flex items-center justify-center text-[#2d563c] bg-[#eef6f0] hover:bg-[#dcefe1]"
        >
          <Check className="w-3.5 h-3.5 text-[#2d563c]" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

// 🔽 Simple Select Box
const SelectBox = ({ value, options = ["No", "Yes"], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setIsOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#e2e2e2] rounded-[8px] px-3.5 py-2 text-[12.5px] font-medium text-[#080808] flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      >
        <span className="truncate">{value || options[0]}</span>
        <ChevronDown className="w-4 h-4 text-[#555] shrink-0 ml-2" strokeWidth={2} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[130px] bg-white rounded-[8px] shadow-lg border border-gray-100 py-1 z-30 animate-in fade-in">
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`px-3.5 py-2 text-[12.5px] cursor-pointer transition-colors ${
                value === opt
                  ? "bg-[#eef6f0] text-[#2d563c] font-semibold"
                  : "hover:bg-zinc-50 text-zinc-700 font-medium"
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 📅 DatePicker Box
const DatePickerBox = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const displayDate = useMemo(() => formatLongDate(value), [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    if (!raw) {
      onChange("-");
      return;
    }
    const [year, month, day] = raw.split("-");
    const formatted = `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
    onChange(formatted);
  };

  const isoValue = useMemo(() => {
    if (!value || value === "-" || value === "TBA") return "";
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const parsed = new Date(value);
    if (!isNaN(parsed) && parsed.getFullYear() > 2020) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
    return "";
  }, [value]);

  const handleOpen = () => {
    try {
      if (inputRef.current?.showPicker) {
        inputRef.current.showPicker();
      } else {
        inputRef.current?.focus();
      }
    } catch (_) {}
  };

  return (
    <div
      onClick={handleOpen}
      className="relative w-full bg-white border border-[#e2e2e2] rounded-[8px] px-3.5 py-2 text-[12.5px] font-medium text-[#080808] flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-gray-300 transition-colors cursor-pointer select-none"
    >
      <span className="truncate">{displayDate || "-"}</span>
      <Calendar className="w-4 h-4 text-[#666] shrink-0 ml-2 pointer-events-none" strokeWidth={1.8} />

      <input
        ref={inputRef}
        type="date"
        value={isoValue}
        onChange={handleChange}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
        }}
      />
    </div>
  );
};

const EventDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const initialEvent = useMemo(() => {
    if (location.state?.event) return location.state.event;
    try {
      const stored = sessionStorage.getItem("allEvents");
      if (stored) {
        const parsed = JSON.parse(stored);
        const match = (parsed || []).find((e) => String(e.id) === String(id));
        if (match) return match;
      }
    } catch (_) {}
    return null;
  }, [id, location.state]);

  const [formData, setFormData] = useState({
    status: initialEvent?.status || "Confirmed",
    outreach_timing: initialEvent?.outreach_timing || initialEvent?.outreachTiming || "-",
    proposal_deadline: initialEvent?.proposal_deadline || initialEvent?.proposalDeadline || "-",
    registration_deadline: initialEvent?.registration_deadline || initialEvent?.registration_deadline || "-",
    exhibit_registered: initialEvent?.exhibit_registered || initialEvent?.exhibitRegistered || "No",
    payment_completed: initialEvent?.payment_completed || initialEvent?.paymentCompleted || "No",
    set_up_time: initialEvent?.set_up_time || initialEvent?.setUpTime || (initialEvent?.time && initialEvent?.time !== "TBA" ? initialEvent.time : "TBD"),
    electricity_ordered: initialEvent?.electricity_ordered || initialEvent?.electricityOrdered || "No",
    misc_info: initialEvent?.misc_info || initialEvent?.miscInfo || "-",
    notes: initialEvent?.notes || initialEvent?.description || "-",
  });

  const [savedField, setSavedField] = useState(null);
  const saveTimerRef = useRef(null);

  const handleBack = () => {
    sessionStorage.setItem("restoreScroll", "true");
    navigate("/", { replace: true });
  };

  if (!initialEvent) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
        <Sidebar activeTab="events" onTabChange={(tab) => (tab === "events" ? handleBack() : null)} />
        <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col p-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-[12px] text-[#558066] hover:text-[#2d563c] font-medium transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="mt-12 bg-white rounded-[14px] p-10 text-center shadow max-w-md mx-auto">
            <p className="text-[15px] font-bold text-[#141414]">Event Not Found</p>
            <p className="text-[12px] text-[rgba(68,67,67,0.78)] mt-1.5 mb-6">The requested event could not be found.</p>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#558066] hover:bg-[#2d563c] rounded-lg transition-colors cursor-pointer"
            >
              Return to Events List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unified save handler
  const saveField = async (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    setSavedField(key);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSavedField(null), 2000);

    try {
      await updateEventApi(initialEvent.id, { [key]: val });
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const fullLocation = [initialEvent.location || initialEvent.city, initialEvent.venue].filter(Boolean).join(" — ") || "-";
  const rawContact = String(initialEvent.contactInfo || initialEvent.contact_info || initialEvent.email || "").trim();
  const contact = !rawContact || /not available|n\/a|^-$|^#$/i.test(rawContact)
    ? initialEvent.ticketUrl && !initialEvent.ticketUrl.includes("google.com/search") && initialEvent.ticketUrl !== "#"
      ? initialEvent.ticketUrl
      : initialEvent.ticket_url && !initialEvent.ticket_url.includes("google.com/search") && initialEvent.ticket_url !== "#"
      ? initialEvent.ticket_url
      : initialEvent.link && initialEvent.link !== "#"
      ? initialEvent.link
      : null
    : rawContact;
  const isEmail = contact?.includes("@") && !contact?.startsWith("http");
  const isUrl = contact?.startsWith("http");
  const audience = initialEvent.audienceType || initialEvent.audience_type || "-";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
      <Sidebar activeTab="events" onTabChange={(tab) => (tab === "events" ? handleBack() : null)} />
      <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col pl-[25px] pr-[25px] pt-5 pb-5">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-[12px] text-[#558066] hover:text-[#2d563c] font-medium transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </div>

        <h1 className="mt-2 text-[17px] font-bold text-[#141414] tracking-tight">
          {initialEvent.title || initialEvent.name || "Untitled Event"}
        </h1>

        <div className="mt-5 space-y-4 w-full">
          {/* Card 1: Core Information */}
          <DetailCard title="Core Information">
            <InfoField label="Event Name" value={initialEvent.title || initialEvent.name} />
            <InfoField label="Event Type" value={initialEvent.type || initialEvent.category} />
            <InfoField label="Organization" value={initialEvent.organization || initialEvent.organizer || initialEvent.source} />
            <InfoField label="Date" value={formatLongDate(initialEvent.date)} />
            <InfoField label="Location" value={fullLocation} />
            <InfoField label="Audience Type" value={audience} />
            <InfoField label="Opportunity Type" value={initialEvent.opportunityType || initialEvent.opportunity_type || initialEvent.category || initialEvent.type} />
            <InfoField label="Contact Info">
              {isEmail ? (
                <a href={`mailto:${contact}`} className="text-[12.5px] font-medium text-[#487358] underline hover:text-[#2d563c]">
                  {contact}
                </a>
              ) : isUrl ? (
                <a href={contact} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-[#487358] underline hover:text-[#2d563c] inline-flex items-center gap-1">
                  <span>Visit Event Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-[12.5px] font-bold text-[#080808]">{contact || "-"}</p>
              )}
            </InfoField>
            <InfoField label="Status" showSaved={savedField === "status"}>
              <SelectBox
                value={formData.status}
                options={["Confirmed", "Need to contact", "Declined"]}
                onChange={(val) => saveField("status", val)}
              />
            </InfoField>
            <InfoField label="Notes" showSaved={savedField === "notes"} className="col-span-full">
              <InputBox
                value={formData.notes}
                onChange={(val) => saveField("notes", val)}
                placeholder="Add notes..."
              />
            </InfoField>
          </DetailCard>

          {/* Card 2: Planning */}
          <DetailCard title="Planning">
            <InfoField label="Outreach Timing" showSaved={savedField === "outreach_timing"}>
              <InputBox
                value={formData.outreach_timing}
                onChange={(val) => saveField("outreach_timing", val)}
                placeholder="e.g. Q3 2025"
              />
            </InfoField>
            <InfoField label="Presentation Proposal Deadline" showSaved={savedField === "proposal_deadline"}>
              <DatePickerBox
                value={formData.proposal_deadline}
                onChange={(val) => saveField("proposal_deadline", val)}
              />
            </InfoField>
            <InfoField label="Exhibit Registration Deadline" showSaved={savedField === "registration_deadline"}>
              <InputBox
                value={formData.registration_deadline}
                onChange={(val) => saveField("registration_deadline", val)}
                placeholder="e.g. TBD"
              />
            </InfoField>
          </DetailCard>

          {/* Card 3: Registration Tracking */}
          <DetailCard title="Registration Tracking">
            <InfoField label="Exhibit Registered?" showSaved={savedField === "exhibit_registered"}>
              <SelectBox
                value={formData.exhibit_registered}
                options={["No", "Yes"]}
                onChange={(val) => saveField("exhibit_registered", val)}
              />
            </InfoField>
            <InfoField label="Payment Completed?" showSaved={savedField === "payment_completed"}>
              <SelectBox
                value={formData.payment_completed}
                options={["No", "Yes"]}
                onChange={(val) => saveField("payment_completed", val)}
              />
            </InfoField>
          </DetailCard>

          {/* Card 4: Logistics */}
          <DetailCard title="Logistics">
            <InfoField label="Set-up Time" showSaved={savedField === "set_up_time"}>
              <InputBox
                value={formData.set_up_time}
                onChange={(val) => saveField("set_up_time", val)}
                placeholder="TBD"
              />
            </InfoField>
            <InfoField label="Electricity Ordered?" showSaved={savedField === "electricity_ordered"}>
              <SelectBox
                value={formData.electricity_ordered}
                options={["No", "Yes"]}
                onChange={(val) => saveField("electricity_ordered", val)}
              />
            </InfoField>
            <InfoField label="Misc Info" showSaved={savedField === "misc_info"}>
              <InputBox
                value={formData.misc_info}
                onChange={(val) => saveField("misc_info", val)}
                placeholder="Add misc info..."
              />
            </InfoField>
          </DetailCard>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-5 pb-2 border-t border-[rgba(8,8,8,0.08)] flex items-center justify-between text-[11px] text-[rgba(68,67,67,0.7)] select-none">
          <p>© 2026, eventscout. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-black transition-colors">License</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EventDetail;
