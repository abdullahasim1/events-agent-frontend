import { useState } from "react";
import { ArrowUpDown, Eye, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Sparkles } from "lucide-react";
import { Select, Button } from "./common";

const formatDate = (val) => {
  if (!val || val === "TBA") return "TBA";
  const d = new Date(val);
  return isNaN(d) ? val : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const COLS = [
  { key: "title", label: "Event Name", width: "28.5%", sortable: true },
  { key: "date", label: "Date", width: "28.5%", sortable: true },
  { key: "location", label: "Location", width: "28.5%", sortable: true },
  { key: "actions", label: "Actions", width: "11.5%", sortable: false },
];

const EventTable = ({ events = [], loading = false, onViewEvent = () => {}, onOpenRunModal = () => {} }) => {
  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState({ field: "date", asc: true });
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);

  const toggleAll = (e) => setSelected(e.target.checked ? events.map((ev) => ev.id) : []);
  const toggleOne = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const handleSort = (field) => setSort((s) => ({ field, asc: s.field === field ? !s.asc : true }));

  const sorted = [...events].sort((a, b) => {
    const valA = String(a[sort.field] || a.name || "").toLowerCase();
    const valB = String(b[sort.field] || b.name || "").toLowerCase();
    return sort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const total = sorted.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const safePage = Math.min(page, totalPages);
  const start = total > 0 ? (safePage - 1) * perPage : 0;
  const pagedEvents = sorted.slice(start, start + perPage);

  return (
    <div className="flex-1 flex flex-col select-none">
      <div className="mt-5 bg-white rounded-[10px] overflow-hidden shadow-[0_0_2.5px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(8,8,8,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left min-w-[860px]">
            <colgroup>
              <col style={{ width: "3%" }} />
              {COLS.map((c, i) => (
                <col key={i} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="h-[44px] bg-[rgba(227,227,227,0.67)] text-[13px] text-[#080808]">
                <th className="px-[15px] align-middle">
                  <input
                    type="checkbox"
                    checked={total > 0 && selected.length === total}
                    onChange={toggleAll}
                    className="w-[13px] h-[13px] rounded-[3px] bg-[#919191] checked:bg-[#86af96] cursor-pointer"
                  />
                </th>
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={`px-2 font-normal align-middle ${col.sortable ? "cursor-pointer hover:opacity-70" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {col.sortable && <ArrowUpDown className="w-2.5 h-2.5 text-[#7a7a7a]" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px] text-[#444343]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-5 h-5 border-2 border-[#82aa92] border-t-transparent rounded-full animate-spin" />
                      <span>Loading events from API...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-500">
                    <p className="font-medium text-[#1a1a1a]">No events found</p>
                    <p className="text-xs mt-1 mb-2">Click "Run Agent" to discover live events.</p>
                    <Button variant="primary" size="sm" icon={Sparkles} onClick={onOpenRunModal}>
                      Run Agent Now
                    </Button>
                  </td>
                </tr>
              ) : (
                pagedEvents.map((e) => (
                  <tr key={e.id} className="h-[50px] border-b border-[#ececec] hover:bg-[#fafafa] transition-colors">
                    <td className="px-[15px] align-middle">
                      <input
                        type="checkbox"
                        checked={selected.includes(e.id)}
                        onChange={() => toggleOne(e.id)}
                        className="w-[13px] h-[13px] rounded-[3px] bg-[#d4d4d4] checked:bg-[#86af96] cursor-pointer"
                      />
                    </td>
                    <td className="px-2 align-middle truncate font-medium text-zinc-900" title={e.title || e.name}>
                      {e.title || e.name}
                    </td>
                    <td className="px-2 align-middle whitespace-nowrap">
                      <div className="flex flex-col justify-center">
                        <span className="leading-tight">{formatDate(e.date)}</span>
                        <span className="text-[11px] text-zinc-500 font-normal leading-tight mt-0.5">
                          {e.time && !/^(tba|tbh|-)$/i.test(String(e.time).trim()) ? e.time : '09:00 AM - 05:00 PM'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 align-middle truncate" title={e.location || e.city}>
                      {e.location || e.city}
                    </td>
                    <td className="pl-6 pr-2 align-middle">
                      <button type="button" onClick={() => onViewEvent(e)} title="View Details" className="text-[#444343] hover:text-black cursor-pointer">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      <div className="mt-4 h-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-zinc-600">Result per page</span>
          <Select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            options={[10, 25, 50, 100]}
            containerClassName="w-[50px] h-6"
            className="!rounded-md !pl-2 !pr-4 !text-[11px] !leading-none"
            caretClassName="!right-1 !w-2"
          />
        </div>

        <div className="flex items-center gap-6">
          <span className="text-[12px] text-zinc-500">
            {total > 0 ? `${start + 1}-${Math.min(start + perPage, total)} of ${total}` : "0 of 0"}
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { icon: ChevronsLeft, onClick: () => setPage(1), dis: safePage === 1 },
              { icon: ChevronLeft, onClick: () => setPage((p) => Math.max(1, p - 1)), dis: safePage === 1 },
              { icon: ChevronRight, onClick: () => setPage((p) => Math.min(totalPages, p + 1)), dis: safePage >= totalPages || total === 0 },
              { icon: ChevronsRight, onClick: () => setPage(totalPages), dis: safePage >= totalPages || total === 0 },
            ].map((b, i) => (
              <button
                key={i}
                type="button"
                disabled={b.dis}
                onClick={b.onClick}
                className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a] text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <b.icon className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-6 pb-2 flex items-center justify-between text-[11px] text-zinc-500">
        <div>&copy; 2026, <span className="text-[#558066] font-medium">eventscout</span>. All Rights Reserved.</div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-black">License</a>
          <a href="#" className="hover:text-black">Terms of Use</a>
          <a href="#" className="hover:text-black">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
};

export default EventTable;
