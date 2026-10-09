import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, ExternalLink, ChevronDown, ChevronUp, Pencil, Calendar, Check } from "lucide-react";
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

// Reusable card & field helpers
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

const InfoField = ({ label, value, className = "", children }) => (
  <div className={className}>
    <p className="text-[11px] font-normal text-[rgba(68,67,67,0.78)] mb-1">
      {label}
    </p>
    {children || (
      <p className="text-[12.5px] font-semibold text-[#080808] leading-snug">
        {value || "-"}
      </p>
    )}
  </div>
);

// 🏷️ Saved Indicator Badge
const SavedBadge = ({ show }) => {
  if (!show) return null;
  return (
    <span className="text-[11px] font-semibold text-[#2d563c] bg-[#eef6f0] px-1.5 py-0.5 rounded inline-flex items-center gap-1 select-none shadow-[0_1px_2px_rgba(0,0,0,0.04)] animate-in fade-in">
      <Check className="w-3 h-3 text-[#2d563c]" strokeWidth={2.5} />
      Saved
    </span>
  );
};

// ✏️ Inline Editable Text
const EditableText = ({ value, onChange, showSaved, icon: Icon = Pencil, placeholder = "-" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value === "-" ? "" : value);

  useEffect(() => {
    setDraft(value === "-" ? "" : value);
  }, [value]);

  const handleCommit = () => {
    setIsEditing(false);
    const finalVal = draft.trim() || "-";
    if (finalVal !== value) onChange(finalVal);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCommit();
            if (e.key === "Escape") {
              setDraft(value === "-" ? "" : value);
              setIsEditing(false);
            }
          }}
          onBlur={handleCommit}
          autoFocus
          className="text-[12.5px] font-semibold text-[#080808] border border-[#558066] rounded px-2 py-0.5 outline-none w-full bg-white shadow-sm focus:ring-1 focus:ring-[#558066]"
        />
        <button
          type="button"
          onMouseDown={handleCommit}
          className="p-1 text-[#558066] hover:bg-[#eef6f0] rounded cursor-pointer shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 max-w-full">
      <div
        onClick={() => setIsEditing(true)}
        className="inline-flex items-center gap-1.5 cursor-pointer group select-none max-w-full"
      >
        <p className="text-[12.5px] font-semibold text-[#080808] leading-snug group-hover:text-[#2d563c] transition-colors break-words">
          {value || placeholder}
        </p>
        <Icon className="w-3.5 h-3.5 text-[#080808] opacity-80 group-hover:opacity-100 group-hover:text-[#2d563c] transition-opacity shrink-0" strokeWidth={2.2} />
      </div>
      <SavedBadge show={showSaved} />
    </div>
  );
};

// 🔽 Status Dropdown
const StatusDropdown = ({ value, onChange, showSaved }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setIsOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const colorClass = /need|contact|pending/i.test(value)
    ? "text-[#cf2d22]"
    : /decline|cancel/i.test(value)
    ? "text-zinc-600"
    : "text-[#487358]";

  return (
    <div className="relative inline-flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold cursor-pointer select-none transition-colors ${colorClass}`}
      >
        <span>{value || "Confirmed"}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#080808] shrink-0" strokeWidth={2.5} />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#080808] shrink-0" strokeWidth={2.5} />
        )}
      </button>
      <SavedBadge show={showSaved} />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-30">
          {["Confirmed", "Need to contact", "Declined"].map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors ${
                value === opt
                  ? "bg-[#e5ece7] text-[#2d563c] font-semibold"
                  : "hover:bg-zinc-50 text-zinc-700"
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

// 🔽 Yes / No Dropdown
const YesNoDropdown = ({ value, onChange, showSaved }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setIsOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative inline-flex items-center gap-2" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#080808] hover:text-[#558066] cursor-pointer select-none transition-colors"
      >
        <span>{value || "No"}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#080808] shrink-0" strokeWidth={2.5} />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#080808] shrink-0" strokeWidth={2.5} />
        )}
      </button>
      <SavedBadge show={showSaved} />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-20 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-30">
          {["Yes", "No"].map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`px-3 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${
                value === opt ? "bg-[#e5ece7] text-[#2d563c]" : "hover:bg-zinc-50 text-zinc-700"
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

// 📅 Native Interactive Date Picker Component
const DatePickerField = ({ value, onChange, showSaved, placeholder = "-" }) => {
  const inputRef = useRef(null);

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split("-");
    if (parts.length === 3) {
      const formatted = `${MONTHS[Number(parts[1]) - 1]} ${Number(parts[2])}, ${parts[0]}`;
      onChange(formatted);
    }
  };

  const openCalendar = () => {
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2">
      <div
        onClick={openCalendar}
        className="inline-flex items-center gap-1.5 cursor-pointer group select-none max-w-full"
      >
        <p className="text-[12.5px] font-semibold text-[#080808] leading-snug group-hover:text-[#2d563c] transition-colors break-words">
          {value || placeholder}
        </p>
        <Calendar className="w-3.5 h-3.5 text-[#080808] opacity-80 group-hover:opacity-100 group-hover:text-[#2d563c] transition-opacity shrink-0" strokeWidth={2.2} />
      </div>
      <input
        ref={inputRef}
        type="date"
        onChange={handleDateChange}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />
      <SavedBadge show={showSaved} />
    </div>
  );
};

const EventDetail = ({ event: propEvent, onBack: propOnBack }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEvent = useMemo(() => {
    if (propEvent) return propEvent;
    if (location.state?.event) return location.state.event;
    return null;
  }, [propEvent, location.state]);

  const [formData, setFormData] = useState(initialEvent || {});
  const [savedField, setSavedField] = useState(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (initialEvent) setFormData(initialEvent);
  }, [initialEvent]);

  const handleBack = () => (propOnBack ? propOnBack() : navigate("/"));

  if (!initialEvent) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
        <Sidebar activeTab="events" onTabChange={(tab) => (tab === "events" ? handleBack() : null)} />
        <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col pl-[25px] pr-[25px] pt-5 pb-5">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-[12px] text-[#558066] hover:text-[#2d563c] font-medium transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Events</span>
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

  // Unified concise save handler
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
  const rawContact = String(initialEvent.contactInfo || initialEvent.email || "").trim();
  const contact = !rawContact || /not available|n\/a|^-$/i.test(rawContact)
    ? initialEvent.ticketUrl && !initialEvent.ticketUrl.includes("google.com/search")
      ? initialEvent.ticketUrl
      : initialEvent.link || null
    : rawContact;
  const isEmail = contact?.includes("@") && !contact?.startsWith("http");
  const isUrl = contact?.startsWith("http");

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
            <InfoField label="Audience Type" value={initialEvent.audienceType} />
            <InfoField label="Opportunity Type" value={initialEvent.opportunityType || initialEvent.category || initialEvent.type} />
            <InfoField label="Contact Info">
              {isEmail ? (
                <a href={`mailto:${contact}`} className="text-[12.5px] font-semibold text-[#487358] hover:underline">
                  {contact}
                </a>
              ) : isUrl ? (
                <a href={contact} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-[#487358] hover:underline inline-flex items-center gap-1">
                  <span>Visit Event Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-[12.5px] font-semibold text-[#080808]">{contact || "-"}</p>
              )}
            </InfoField>
            <InfoField label="Status">
              <StatusDropdown
                value={formData.status || "Confirmed"}
                onChange={(val) => saveField("status", val)}
                showSaved={savedField === "status"}
              />
            </InfoField>
            <InfoField label="Notes" className="col-span-full">
              <p className="text-[12.5px] text-[#444343] leading-relaxed">
                {initialEvent.notes || initialEvent.description || "-"}
              </p>
            </InfoField>
          </DetailCard>

          {/* Card 2: Planning */}
          <DetailCard title="Planning">
            <InfoField label="Outreach Timing">
              <EditableText
                value={formData.outreachTiming || formData.outreach_timing || "-"}
                onChange={(val) => saveField("outreach_timing", val)}
                showSaved={savedField === "outreach_timing"}
              />
            </InfoField>
            <InfoField label="Presentation Proposal Deadline">
              <DatePickerField
                value={formData.proposalDeadline || formData.proposal_deadline || "-"}
                onChange={(val) => saveField("proposal_deadline", val)}
                showSaved={savedField === "proposal_deadline"}
              />
            </InfoField>
            <InfoField label="Exhibit Registration Deadline">
              <EditableText
                value={formData.registrationDeadline || formData.registration_deadline || "-"}
                onChange={(val) => saveField("registration_deadline", val)}
                showSaved={savedField === "registration_deadline"}
              />
            </InfoField>
          </DetailCard>

          {/* Card 3: Registration Tracking */}
          <DetailCard title="Registration Tracking">
            <InfoField label="Exhibit Registered?">
              <YesNoDropdown
                value={formData.exhibitRegistered || formData.exhibit_registered || "No"}
                onChange={(val) => saveField("exhibit_registered", val)}
                showSaved={savedField === "exhibit_registered"}
              />
            </InfoField>
            <InfoField label="Payment Completed?">
              <YesNoDropdown
                value={formData.paymentCompleted || formData.payment_completed || "No"}
                onChange={(val) => saveField("payment_completed", val)}
                showSaved={savedField === "payment_completed"}
              />
            </InfoField>
          </DetailCard>

          {/* Card 4: Logistics */}
          <DetailCard title="Logistics">
            <InfoField label="Set-up Time">
              <EditableText
                value={formData.setUpTime || formData.set_up_time || formData.setupTime || (initialEvent.time && initialEvent.time !== "TBA" ? initialEvent.time : "TBD")}
                onChange={(val) => saveField("set_up_time", val)}
                showSaved={savedField === "set_up_time"}
              />
            </InfoField>
            <InfoField label="Electricity Ordered?">
              <div className="inline-flex items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.electricityOrdered === "Yes" || formData.electricity_ordered === "Yes"}
                    onChange={(e) => saveField("electricity_ordered", e.target.checked ? "Yes" : "No")}
                    className="w-4 h-4 rounded border-gray-300 text-[#487358] focus:ring-[#487358] cursor-pointer"
                  />
                  <span className={`text-[12.5px] font-semibold ${formData.electricityOrdered === "Yes" || formData.electricity_ordered === "Yes" ? "text-[#487358]" : "text-[#777]"}`}>
                    {formData.electricityOrdered === "Yes" || formData.electricity_ordered === "Yes" ? "Yes" : "No"}
                  </span>
                </label>
                <SavedBadge show={savedField === "electricity_ordered"} />
              </div>
            </InfoField>
            <InfoField label="Misc Info">
              <EditableText
                value={formData.miscInfo || formData.misc_info || "-"}
                onChange={(val) => saveField("misc_info", val)}
                showSaved={savedField === "misc_info"}
              />
            </InfoField>
          </DetailCard>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-5 pb-2 border-t border-[rgba(8,8,8,0.08)] flex items-center justify-between text-[11px] text-[rgba(68,67,67,0.7)] select-none">
          <p>© 2026, eventscout, All Rights Reserved.</p>
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
