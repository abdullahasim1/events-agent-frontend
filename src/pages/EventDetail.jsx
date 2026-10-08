import { useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, ExternalLink } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatLongDate = (dateStr) => {
  if (!dateStr || dateStr === "TBA" || String(dateStr).includes("Check link"))
    return dateStr || "TBA";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match
    ? `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`
    : dateStr;
};

// Reusable card & field helpers to keep code compact and DRY
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
  const status = event.status || "Upcoming";
  const isPending = /need|contact|pending/i.test(status);

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
              <p
                className={`text-[12.5px] font-semibold ${isPending ? "text-[#e0453d]" : "text-[#487358]"}`}
              >
                {status}
              </p>
            </InfoField>
            <InfoField label="Notes" className="col-span-full">
              <p className="text-[12.5px] text-[#444343] leading-relaxed">
                {event.notes || event.description || "-"}
              </p>
            </InfoField>
          </DetailCard>

          {/* Card 2: Planning */}
          <DetailCard title="Planning">
            <InfoField label="Outreach Timing" value={event.outreachTiming} />
            <InfoField
              label="Presentation Proposal Deadline"
              value={event.proposalDeadline}
            />
            <InfoField
              label="Exhibit Registration Deadline"
              value={event.registrationDeadline}
            />
          </DetailCard>

          {/* Card 3: Registration Tracking */}
          <DetailCard title="Registration Tracking">
            <InfoField
              label="Exhibit Registered?"
              value={event.exhibitRegistered ? "Yes" : "No"}
            />
            <InfoField
              label="Payment Completed?"
              value={event.paymentCompleted ? "Yes" : "No"}
            />
          </DetailCard>

          {/* Card 4: Logistics */}
          <DetailCard title="Logistics">
            <InfoField
              label="Set-up Time"
              value={
                event.setupTime ||
                (event.time && event.time !== "TBA" ? event.time : "TBD")
              }
            />
            <InfoField
              label="Electricity Ordered?"
              value={event.electricityOrdered ? "Yes" : "-"}
            />
            <InfoField label="Misc Info" value={event.miscInfo} />
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
