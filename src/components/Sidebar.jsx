import { Camera } from "lucide-react";

const Sidebar = ({ activeTab = "events", onTabChange = () => {} }) => (
  <aside className="w-60 shrink-0 h-[calc(100vh-20px)] sticky top-[10px] my-[10px] ml-[10px] flex flex-col justify-between bg-[#1a1a1a] text-white rounded-[14px] p-3 select-none">
    <div className="flex flex-col gap-5">
      <div className="h-9 px-2 pb-3 flex items-center gap-2 border-b border-white/10">
        <svg
          width="16"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M11.7 3.6 A5.75 5.75 0 1 0 12.07 12.07"
            stroke="#86af96"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="7.6" cy="8" r="1.6" fill="#86af96" />
        </svg>
        <span className="text-[15px] font-bold text-white">EventScout</span>
      </div>

      <nav className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onTabChange("events")}
          className={`h-8 w-full flex items-center gap-2.5 px-2.5 rounded-lg text-[11px] cursor-pointer transition-all ${
            activeTab === "events"
              ? "bg-[#86af96] text-[#080808] font-semibold"
              : "text-zinc-200 hover:bg-white/5"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Events</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("settings")}
          className={`h-8 w-full flex items-center justify-between px-2.5 rounded-lg text-[11px] cursor-pointer transition-all ${
            activeTab === "settings"
              ? "bg-[#86af96] text-[#080808] font-semibold"
              : "text-zinc-200 hover:bg-white/5"
          }`}
        ></button>
      </nav>
    </div>

    <div className="pt-2 border-t border-white/10">
      <button
        type="button"
        className="h-8 w-full flex items-center gap-2.5 px-2.5 rounded-lg text-[11px] text-zinc-300 hover:bg-white/5 cursor-pointer"
      ></button>
    </div>
  </aside>
);

export default Sidebar;
