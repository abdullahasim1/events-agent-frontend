import { useState } from "react";
import {
  ArrowUpDown,
  Eye,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Select } from "./common";

const formatDate = (val) => {
  if (!val || val === "TBA") return "TBA";
  const d = new Date(val);
  return isNaN(d)
    ? val
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const COLS = [
  { key: "title", label: "Event Name", width: "38%", sortable: true },
  { key: "date", label: "Date", width: "22%", sortable: true },
  { key: "location", label: "Location", width: "28%", sortable: true },
  { key: "actions", label: "Actions", width: "12%", sortable: false },
];

const EventTable = ({
  events = [],
  loading = false,
  onViewEvent = () => {},
  onOpenRunModal = () => {},
}) => {
  const [sort, setSort] = useState({ field: "latest", asc: false });
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);

  const handleSort = (field) =>
    setSort((s) => ({ field, asc: s.field === field ? !s.asc : true }));

  const sorted = [...events].sort((a, b) => {
    // 1. If sorted by latest (Default): Show newly fetched live items at the top
    if (sort.field === "latest") {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      // Proximity Tier Secondary (Near first)
      const tierDiff =
        (Number(a.proximityTier) || 99) - (Number(b.proximityTier) || 99);
      if (tierDiff !== 0) return tierDiff;
      return String(a.date || "").localeCompare(String(b.date || ""));
    }

    // 2. Proximity Tier Sort
    if (sort.field === "proximityTier") {
      const tierA = Number(a.proximityTier) || 99;
      const tierB = Number(b.proximityTier) || 99;
      if (tierA !== tierB) return sort.asc ? tierA - tierB : tierB - tierA;
      return String(a.date || "").localeCompare(String(b.date || ""));
    }

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
              {COLS.map((c, i) => (
                <col key={i} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="h-[44px] bg-[rgba(227,227,227,0.67)] text-[13px] text-[#080808]">
                {COLS.map((col, idx) => (
                  <th
                    key={col.key}
                    onClick={
                      col.sortable ? () => handleSort(col.key) : undefined
                    }
                    className={`px-2 font-normal align-middle ${idx === 0 ? "pl-5" : ""} ${col.sortable ? "cursor-pointer hover:opacity-70" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <ArrowUpDown className="w-2.5 h-2.5 text-[#7a7a7a]" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px] text-[#444343]">
              {loading && pagedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-7 h-7 border-[2.5px] border-[#82aa92] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[13px] font-medium text-[#444343]">
                        Loading events...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : pagedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-zinc-500">
                    <p className="font-medium text-[#1a1a1a]">
                      No events found
                    </p>
                  </td>
                </tr>
              ) : (
                pagedEvents.map((e) => (
                  <tr
                    key={e.id}
                    className={`h-[50px] border-b border-[#ececec] transition-colors ${
                      e.isNew
                        ? "bg-emerald-50/60 hover:bg-emerald-50"
                        : "hover:bg-[#fafafa]"
                    }`}
                  >
                    <td
                      className="pl-5 pr-2 align-middle truncate font-medium text-zinc-900"
                      title={e.title || e.name}
                    >
                      <div className="flex items-center gap-2">
                        {e.isNew && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-100 rounded">
                            NEW
                          </span>
                        )}
                        <span
                          onClick={() => onViewEvent(e)}
                          className="truncate cursor-pointer hover:text-emerald-800 hover:underline"
                        >
                          {e.title || e.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 align-middle whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td
                      className="px-2 align-middle truncate"
                      title={e.location || e.city}
                    >
                      {e.location || e.city}
                    </td>
                    <td className="pl-6 pr-2 align-middle">
                      <button
                        type="button"
                        onClick={() => onViewEvent(e)}
                        title="View Details"
                        className="text-[#444343] hover:text-black cursor-pointer"
                      >
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
            {total > 0
              ? `${start + 1}-${Math.min(start + perPage, total)} of ${total}`
              : "0 of 0"}
          </span>
          <div className="flex items-center gap-1.5">
            {[
              {
                icon: ChevronsLeft,
                onClick: () => setPage(1),
                dis: safePage === 1,
              },
              {
                icon: ChevronLeft,
                onClick: () => setPage((p) => Math.max(1, p - 1)),
                dis: safePage === 1,
              },
              {
                icon: ChevronRight,
                onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
                dis: safePage >= totalPages || total === 0,
              },
              {
                icon: ChevronsRight,
                onClick: () => setPage(totalPages),
                dis: safePage >= totalPages || total === 0,
              },
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
        <div>
          &copy; 2026,{" "}
          <span className="text-[#558066] font-medium">eventscout</span>. All
          Rights Reserved.
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-black">
            License
          </a>
          <a href="#" className="hover:text-black">
            Terms of Use
          </a>
          <a href="#" className="hover:text-black">
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
};

export default EventTable;
