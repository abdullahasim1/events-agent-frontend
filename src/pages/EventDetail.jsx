import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, ChevronDown, ChevronUp, Pencil, Calendar, Check } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
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

// 🏷️ Reusable Save Status Badge
const SavedBadge = ({ status }) => {
  if (!status) return null;
  if (status === "saving") {
    return (
      <span className="text-[11px] text-zinc-400 font-medium animate-pulse select-none shrink-0">
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="text-[11px] font-semibold text-[#2d563c] bg-[#eef6f0] px-1.5 py-0.5 rounded inline-flex items-center gap-1 select-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] shrink-0">
        <Check className="w-3 h-3 text-[#2d563c]" strokeWidth={2.5} />
        Saved
      </span>
    );
  }
  return null;
};

// ✏️ Inline Editable Text Component with icon
const EditableText = ({ value, onSave, icon: Icon = Pencil, placeholder = "-" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value === "-" ? "" : value);
  const [saveStatus, setSaveStatus] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setDraft(value === "-" ? "" : value);
  }, [value]);

  const handleCommit = async () => {
    setIsEditing(false);
    const finalVal = draft.trim() || "-";
    if (finalVal !== value) {
      setSaveStatus("saving");
      try {
        await onSave(finalVal);
        setSaveStatus("saved");
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaveStatus(null), 2200);
      } catch {
        setSaveStatus(null);
      }
    }
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
        <Icon className="w-3.5 h-3.5 text-[#080808] group-hover:text-[#2d563c] opacity-80 group-hover:opacity-100 transition-opacity shrink-0" strokeWidth={2.2} />
      </div>
      <SavedBadge status={saveStatus} />
    </div>
  );
};

// 🔽 Custom Status Dropdown matching user mockup
const StatusDropdown = ({ value, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectOption = async (opt) => {
    setIsOpen(false);
    if (opt !== value) {
      setSaveStatus("saving");
      try {
        await onSelect(opt);
        setSaveStatus("saved");
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaveStatus(null), 2200);
      } catch {
        setSaveStatus(null);
      }
    }
  };

  const isNeedContact = /need|contact|pending/i.test(value);
  const isDeclined = /decline|cancel/i.test(value);
  const colorClass = isNeedContact
    ? "text-[#cf2d22]"
    : isDeclined
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

      <SavedBadge status={saveStatus} />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-36 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-gray-100 py-1 z-30">
          {["Confirmed", "Need to contact", "Declined"].map((opt) => (
            <div
              key={opt}
              onClick={() => handleSelectOption(opt)}
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

// 🔽 Custom Yes/No Dropdown for Registration Tracking
const YesNoDropdown = ({ value, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectOption = async (opt) => {
    setIsOpen(false);
    if (opt !== value) {
      setSaveStatus("saving");
      try {
        await onSelect(opt);
        setSaveStatus("saved");
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaveStatus(null), 2200);
      } catch {
        setSaveStatus(null);
      }
    }
  };

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

      <SavedBadge status={saveStatus} />

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-20 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100 py-1 z-30">
          {["Yes", "No"].map((opt) => (
            <div
              key={opt}
              onClick={() => handleSelectOption(opt)}
              className={`px-3 py-1 text-[12px] font-semibold cursor-pointer transition-colors ${
                value === opt
                  ? "bg-[#e5ece7] text-[#2d563c]"
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

// 📅 Custom Calendar Date Picker Component
const DatePickerField = ({ value, onSave, placeholder = "-" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualText, setManualText] = useState(value === "-" ? "" : value);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const parseDate = (val) => {
    if (!val || val === "-" || val === "TBD" || val === "TBA") return new Date();
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
    const m = String(val).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date();
  };

  const [viewDate, setViewDate] = useState(() => parseDate(value));

  useEffect(() => {
    setViewDate(parseDate(value));
    setManualText(value === "-" ? "" : value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setIsManualInput(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const triggerSave = async (newVal) => {
    if (newVal !== value) {
      setSaveStatus("saving");
      try {
        await onSave(newVal);
        setSaveStatus("saved");
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaveStatus(null), 2200);
      } catch {
        setSaveStatus(null);
      }
    }
  };

  const handleSelectDay = (day) => {
    const formatted = `${MONTHS[month]} ${day}, ${year}`;
    setIsOpen(false);
    triggerSave(formatted);
  };

  const handleClear = () => {
    setIsOpen(false);
    triggerSave("-");
  };

  const handleToday = () => {
    const now = new Date();
    const formatted = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    setIsOpen(false);
    triggerSave(formatted);
  };

  const handleManualSubmit = () => {
    setIsManualInput(false);
    setIsOpen(false);
    const finalVal = manualText.trim() || "-";
    triggerSave(finalVal);
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const isSelected = (day) => {
    if (!value || value === "-") return false;
    const d = parseDate(value);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day
    );
  };

  const isToday = (day) => {
    const t = new Date();
    return (
      t.getFullYear() === year &&
      t.getMonth() === month &&
      t.getDate() === day
    );
  };

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  return (
    <div className="relative inline-flex items-center gap-2" ref={ref}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 cursor-pointer group select-none max-w-full"
      >
        <p className="text-[12.5px] font-semibold text-[#080808] leading-snug group-hover:text-[#2d563c] transition-colors break-words">
          {value || placeholder}
        </p>
        <Calendar className="w-3.5 h-3.5 text-[#080808] group-hover:text-[#2d563c] opacity-80 group-hover:opacity-100 transition-opacity shrink-0" strokeWidth={2.2} />
      </div>

      <SavedBadge status={saveStatus} />

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.14)] border border-gray-100 p-3.5 w-64 select-none">
          {isManualInput ? (
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-zinc-600">Enter custom text/deadline:</p>
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualSubmit();
                  if (e.key === "Escape") setIsManualInput(false);
                }}
                autoFocus
                className="w-full text-[12px] font-semibold px-2 py-1 border border-[#558066] rounded outline-none"
                placeholder="e.g. October 15, 2025 or TBA"
              />
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsManualInput(false)}
                  className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#558066] text-white rounded hover:bg-[#2d563c] cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header: Month & Year with navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[12.5px] font-bold text-zinc-800">
                  {MONTHS[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                  <div key={dayName} className="text-[10px] font-semibold text-zinc-400">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {daysArray.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="h-7 w-7" />;
                  }
                  const active = isSelected(day);
                  const currentDay = isToday(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-7 w-7 rounded-md text-[11.5px] flex items-center justify-center transition-colors cursor-pointer ${
                        active
                          ? "bg-[#558066] text-white font-bold shadow-sm"
                          : currentDay
                          ? "border border-[#558066] text-[#2d563c] font-semibold hover:bg-[#eef6f0]"
                          : "text-zinc-700 hover:bg-zinc-100 font-medium"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-zinc-400 hover:text-red-500 cursor-pointer font-medium"
                >
                  Clear (-)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualInput(true)}
                    className="text-zinc-500 hover:text-[#2d563c] cursor-pointer"
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="text-[#558066] font-semibold hover:text-[#2d563c] cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const EventDetail = ({ event: propEvent, onBack: propOnBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // Find event from props or router state
  const event = useMemo(() => {
    if (propEvent) return propEvent;
    if (location.state?.event) return location.state.event;
    return null;
  }, [propEvent, location.state]);

  const handleBack = () => (propOnBack ? propOnBack() : navigate("/"));

  // Interactive local states synced with event
  const [status, setStatus] = useState(event?.status || "Confirmed");
  const [outreachTiming, setOutreachTiming] = useState(event?.outreachTiming || event?.outreach_timing || "-");
  const [proposalDeadline, setProposalDeadline] = useState(event?.proposalDeadline || event?.proposal_deadline || "-");
  const [registrationDeadline, setRegistrationDeadline] = useState(event?.registrationDeadline || event?.registration_deadline || "-");
  const [exhibitRegistered, setExhibitRegistered] = useState(event?.exhibitRegistered || event?.exhibit_registered || "No");
  const [paymentCompleted, setPaymentCompleted] = useState(event?.paymentCompleted || event?.payment_completed || "No");
  const [electricityOrdered, setElectricityOrdered] = useState(
    event?.electricityOrdered === "Yes" || event?.electricityOrdered === true || event?.electricity_ordered === "Yes"
  );
  const [setUpTime, setSetUpTime] = useState(
    event?.setUpTime ||
    event?.set_up_time ||
    event?.setupTime ||
    (event?.time && event?.time !== "TBA" ? event?.time : "TBD")
  );
  const [miscInfo, setMiscInfo] = useState(event?.miscInfo || event?.misc_info || "-");

  // Keep state synced if event prop changes
  useEffect(() => {
    if (event) {
      setStatus(event.status || "Confirmed");
      setOutreachTiming(event.outreachTiming || event.outreach_timing || "-");
      setProposalDeadline(event.proposalDeadline || event.proposal_deadline || "-");
      setRegistrationDeadline(event.registrationDeadline || event.registration_deadline || "-");
      setExhibitRegistered(event.exhibitRegistered || event.exhibit_registered || "No");
      setPaymentCompleted(event.paymentCompleted || event.payment_completed || "No");
      setElectricityOrdered(
        event.electricityOrdered === "Yes" || event.electricityOrdered === true || event.electricity_ordered === "Yes"
      );
      setSetUpTime(
        event.setUpTime ||
        event.set_up_time ||
        event.setupTime ||
        (event.time && event.time !== "TBA" ? event.time : "TBD")
      );
      setMiscInfo(event.miscInfo || event.misc_info || "-");
    }
  }, [event]);

  if (!event) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
        <Sidebar
          activeTab="events"
          onTabChange={(tab) => (tab === "events" ? handleBack() : null)}
        />
        <div className="flex-1 min-w-0 h-full overflow-y-auto flex flex-col pl-[25px] pr-[25px] pt-5 pb-5">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-[12px] text-[#558066] hover:text-[#2d563c] font-medium transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Events</span>
          </button>
          <div className="mt-12 bg-white rounded-[14px] p-10 text-center shadow-[0_0_2.5px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(8,8,8,0.04)] max-w-md mx-auto">
            <p className="text-[15px] font-bold text-[#141414]">
              Event Not Found
            </p>
            <p className="text-[12px] text-[rgba(68,67,67,0.78)] mt-1.5 mb-6">
              The requested event could not be found.
            </p>
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

  const fullLocation =
    [event.location || event.city, event.venue].filter(Boolean).join(" — ") ||
    "-";
  const rawContact = String(event.contactInfo || event.email || "").trim();
  const contact =
    !rawContact || /not available|n\/a|^-$/i.test(rawContact)
      ? event.ticketUrl && !event.ticketUrl.includes("google.com/search")
        ? event.ticketUrl
        : event.link || null
      : rawContact;
  const isEmail = contact?.includes("@") && !contact?.startsWith("http");
  const isUrl = contact?.startsWith("http");

  const [electricitySaveStatus, setElectricitySaveStatus] = useState(null);
  const electricityTimerRef = useRef(null);

  // Save handler for backend API
  const saveField = async (fieldKey, value) => {
    try {
      const res = await updateEventApi(event.id, { [fieldKey]: value });
      return res;
    } catch (err) {
      console.error("Save error:", err);
      throw err;
    }
  };

  const handleStatusSelect = (newStatus) => {
    setStatus(newStatus);
    return saveField("status", newStatus);
  };

  const handleToggleElectricity = async (e) => {
    const checked = e.target.checked;
    setElectricityOrdered(checked);
    setElectricitySaveStatus("saving");
    try {
      await saveField("electricity_ordered", checked ? "Yes" : "No");
      setElectricitySaveStatus("saved");
      clearTimeout(electricityTimerRef.current);
      electricityTimerRef.current = setTimeout(() => {
        setElectricitySaveStatus(null);
      }, 2200);
    } catch {
      setElectricitySaveStatus(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
      <Sidebar
        activeTab="events"
        onTabChange={(tab) => (tab === "events" ? handleBack() : null)}
      />
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
          {event.title || event.name || "Untitled Event"}
        </h1>

        <div className="mt-5 space-y-4 w-full">
          {/* Card 1: Core Information */}
          <DetailCard title="Core Information">
            <InfoField label="Event Name" value={event.title || event.name} />
            <InfoField
              label="Event Type"
              value={event.type || event.category}
            />
            <InfoField
              label="Organization"
              value={event.organization || event.organizer || event.source}
            />
            <InfoField label="Date" value={formatLongDate(event.date)} />
            <InfoField label="Location" value={fullLocation} />
            <InfoField label="Audience Type" value={event.audienceType} />
            <InfoField
              label="Opportunity Type"
              value={event.opportunityType || event.category || event.type}
            />
            <InfoField label="Contact Info">
              {isEmail ? (
                <a
                  href={`mailto:${contact}`}
                  className="text-[12.5px] font-semibold text-[#487358] hover:underline"
                >
                  {contact}
                </a>
              ) : isUrl ? (
                <a
                  href={contact}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12.5px] font-semibold text-[#487358] hover:underline inline-flex items-center gap-1"
                >
                  <span>Visit Event Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-[12.5px] font-semibold text-[#080808]">
                  {contact || "-"}
                </p>
              )}
            </InfoField>
            <InfoField label="Status">
              <StatusDropdown
                value={status}
                onSelect={handleStatusSelect}
              />
            </InfoField>
            <InfoField label="Notes" className="col-span-full">
              <p className="text-[12.5px] text-[#444343] leading-relaxed">
                {event.notes || event.description || "-"}
              </p>
            </InfoField>
          </DetailCard>

          {/* Card 2: Planning */}
          <DetailCard title="Planning">
            <InfoField label="Outreach Timing">
              <EditableText
                value={outreachTiming}
                onSave={(val) => {
                  setOutreachTiming(val);
                  return saveField("outreach_timing", val);
                }}
                icon={Pencil}
              />
            </InfoField>
            <InfoField label="Presentation Proposal Deadline">
              <DatePickerField
                value={proposalDeadline}
                onSave={(val) => {
                  setProposalDeadline(val);
                  return saveField("proposal_deadline", val);
                }}
              />
            </InfoField>
            <InfoField label="Exhibit Registration Deadline">
              <EditableText
                value={registrationDeadline}
                onSave={(val) => {
                  setRegistrationDeadline(val);
                  return saveField("registration_deadline", val);
                }}
                icon={Pencil}
              />
            </InfoField>
          </DetailCard>

          {/* Card 3: Registration Tracking */}
          <DetailCard title="Registration Tracking">
            <InfoField label="Exhibit Registered?">
              <YesNoDropdown
                value={exhibitRegistered}
                onSelect={(val) => {
                  setExhibitRegistered(val);
                  return saveField("exhibit_registered", val);
                }}
              />
            </InfoField>
            <InfoField label="Payment Completed?">
              <YesNoDropdown
                value={paymentCompleted}
                onSelect={(val) => {
                  setPaymentCompleted(val);
                  return saveField("payment_completed", val);
                }}
              />
            </InfoField>
          </DetailCard>

          {/* Card 4: Logistics */}
          <DetailCard title="Logistics">
            <InfoField label="Set-up Time">
              <EditableText
                value={setUpTime}
                onSave={(val) => {
                  setSetUpTime(val);
                  return saveField("set_up_time", val);
                }}
                icon={Pencil}
              />
            </InfoField>
            <InfoField label="Electricity Ordered?">
              <div className="inline-flex items-center gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={electricityOrdered}
                    onChange={handleToggleElectricity}
                    className="w-4 h-4 rounded border-gray-300 text-[#487358] focus:ring-[#487358] cursor-pointer"
                  />
                  <span
                    className={`text-[12.5px] font-semibold ${
                      electricityOrdered ? "text-[#487358]" : "text-[#777]"
                    }`}
                  >
                    {electricityOrdered ? "Yes" : "No"}
                  </span>
                </label>
                <SavedBadge status={electricitySaveStatus} />
              </div>
            </InfoField>
            <InfoField label="Misc Info">
              <EditableText
                value={miscInfo}
                onSave={(val) => {
                  setMiscInfo(val);
                  return saveField("misc_info", val);
                }}
                icon={Pencil}
              />
            </InfoField>
          </DetailCard>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-5 pb-2 border-t border-[rgba(8,8,8,0.08)] flex items-center justify-between text-[11px] text-[rgba(68,67,67,0.7)] select-none">
          <p>© 2026, eventscout, All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-black transition-colors">
              License
            </a>
            <a href="#" className="hover:text-black transition-colors">
              Terms of Use
            </a>
            <a href="#" className="hover:text-black transition-colors">
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EventDetail;
