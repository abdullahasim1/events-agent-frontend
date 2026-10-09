import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ChevronLeft, ExternalLink } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { fetchSavedEvents } from "../services/api";

const formatLongDate = (d) => {
  if (!d || d === "TBA") return d || "TBA";
  const parsed = new Date(d);
  return isNaN(parsed) ? d : parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const DetailCard = ({ title, children }) => (
  <div className="w-full bg-white rounded-[14px] p-6 shadow-[0_0_2.5px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(8,8,8,0.04)]">
    <h2 className="text-[13.5px] font-bold text-[#080808] mb-5 tracking-tight">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-5 gap-x-8">{children}</div>
  </div>
);

const InfoField = ({ label, value, className = "", children }) => (
  <div className={className}>
    <p className="text-[11px] font-normal text-[rgba(68,67,67,0.78)] mb-1">{label}</p>
    {children || <p className="text-[12.5px] font-semibold text-[#080808] leading-snug">{value || "-"}</p>}
  </div>
);

const EventDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [event, setEvent] = useState(location.state?.event || null);

  useEffect(() => {
    if (!event && id) {
      fetchSavedEvents().then((items) => {
        if (Array.isArray(items)) {
          const found = items.find((e) => String(e.id) === String(id));
          if (found) setEvent(found);
        }
      });
    }
  }, [id, event]);

  const handleBack = () => navigate("/");

  const fullLocation = event
    ? [event.location || event.city, event.venue].filter(Boolean).join(" — ") || "-"
    : "-";

  // Robust Audience Type resolution
  const audience =
    event?.audienceType ||
    event?.audience_type ||
    (event?.category?.toLowerCase().includes("mental")
      ? "Mental health professionals & community"
      : event?.category?.toLowerCase().includes("education")
      ? "Educators, school counselors & staff"
      : event?.category?.toLowerCase().includes("autism") || event?.category?.toLowerCase().includes("disabilit")
      ? "Professionals & families in special education"
      : "Professional / Public");

  // Robust Contact URL resolution: ALWAYS resolve a valid clickable URL
  const contactUrl =
    (event?.contactInfo && event.contactInfo !== "-" ? event.contactInfo : null) ||
    (event?.contact_info && event.contact_info !== "-" ? event.contact_info : null) ||
    (event?.ticketUrl && event.ticketUrl !== "#" && event.ticketUrl !== "-" ? event.ticketUrl : null) ||
    (event?.ticket_url && event.ticket_url !== "#" && event.ticket_url !== "-" ? event.ticket_url : null) ||
    (event?.url && event.url !== "#" && event.url !== "-" ? event.url : null) ||
    (event?.link && event.link !== "#" && event.link !== "-" ? event.link : null) ||
    `https://www.google.com/search?q=${encodeURIComponent((event?.title || "") + " " + (event?.city || "Minnesota"))}`;

  const isEmail = contactUrl?.includes("@") && !contactUrl?.startsWith("http");
  const isUrl = Boolean(contactUrl?.startsWith("http"));
  const status = event?.status || "Confirmed";
  const isPending = /need|contact|pending/i.test(status);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f1f1f1] text-[#1a1a1a] font-sans antialiased">
      <Sidebar />
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

        {!event ? (
          <div className="mt-12 bg-white rounded-[14px] p-10 text-center shadow-[0_0_2.5px_rgba(0,0,0,0.08)] max-w-md mx-auto">
            <p className="text-[15px] font-bold text-[#141414]">Event Not Found</p>
            <p className="text-[12px] text-zinc-500 mt-1.5 mb-6">The requested event could not be found.</p>
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#558066] hover:bg-[#2d563c] rounded-lg cursor-pointer"
            >
              Return to Events List
            </button>
          </div>
        ) : (
          <>
            <h1 className="mt-2 text-[17px] font-bold text-[#141414] tracking-tight">
              {event.title || "Untitled Event"}
            </h1>

            <div className="mt-5 space-y-4 w-full">
              {/* 1. Core Information */}
              <DetailCard title="Core Information">
                <InfoField label="Event Name" value={event.title} />
                <InfoField label="Event Type" value={event.category || event.type || "Conference / Summit"} />
                <InfoField label="Organization" value={event.organization || event.source} />
                <InfoField label="Date" value={formatLongDate(event.date)} />
                <InfoField label="Location" value={fullLocation} />
                <InfoField label="Audience Type" value={audience} />
                <InfoField label="Opportunity Type" value={event.opportunityType || event.opportunity_type || "Conference"} />
                <InfoField label="Contact Info">
                  {isEmail ? (
                    <a href={`mailto:${contactUrl}`} className="text-[12.5px] font-semibold text-[#487358] hover:underline">
                      {contactUrl}
                    </a>
                  ) : isUrl ? (
                    <a
                      href={contactUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12.5px] font-semibold text-[#487358] hover:underline inline-flex items-center gap-1 group"
                    >
                      <span>Visit Event Page</span>
                      <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  ) : (
                    <p className="text-[12.5px] font-semibold text-[#080808]">{contactUrl || "-"}</p>
                  )}
                </InfoField>
                <InfoField label="Status">
                  <p className={`text-[12.5px] font-semibold ${isPending ? "text-[#e0453d]" : "text-[#487358]"}`}>
                    {status}
                  </p>
                </InfoField>
                <InfoField label="Notes" className="col-span-full">
                  <p className="text-[12.5px] text-[#444343] leading-relaxed">
                    {event.notes || event.description || "-"}
                  </p>
                </InfoField>
              </DetailCard>

              {/* 2. Planning */}
              <DetailCard title="Planning">
                <InfoField label="Outreach Timing" value={event.outreachTiming || "-"} />
                <InfoField label="Presentation Proposal Deadline" value={event.proposalDeadline || event.proposal_deadline || "-"} />
                <InfoField label="Exhibit Registration Deadline" value={event.registrationDeadline || event.registration_deadline || "-"} />
              </DetailCard>

              {/* 3. Registration Tracking */}
              <DetailCard title="Registration Tracking">
                <InfoField label="Exhibit Registered?" value={event.exhibitRegistered || event.exhibit_registered || "No"} />
                <InfoField label="Payment Completed?" value={event.paymentCompleted || event.payment_completed || "No"} />
              </DetailCard>

              {/* 4. Logistics */}
              <DetailCard title="Logistics">
                <InfoField label="Set-up Time" value={event.setUpTime || event.set_up_time || event.time || "TBD"} />
                <InfoField label="Electricity Ordered?" value={event.electricityOrdered || event.electricity_ordered || "-"} />
                <InfoField label="Misc Info" value={event.miscInfo || event.misc_info || "-"} />
              </DetailCard>
            </div>
          </>
        )}

        <footer className="mt-auto pt-8 pb-2 flex items-center justify-between text-[11px] text-zinc-500 select-none">
          <p>© 2026, eventscout, All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-black">License</a>
            <a href="#" className="hover:text-black">Terms of Use</a>
            <a href="#" className="hover:text-black">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EventDetail;
