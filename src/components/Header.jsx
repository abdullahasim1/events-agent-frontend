import { Bell } from "lucide-react";
import { SearchInput } from "./common";

const Header = ({ globalSearch = "", onGlobalSearchChange = () => {} }) => (
  <header className="h-[37px] flex items-center justify-between select-none">
    <SearchInput
      value={globalSearch}
      onChange={(e) => onGlobalSearchChange(e.target.value)}
      placeholder="Search..."
      containerClassName="w-[263px] h-[37px] px-[13px]"
    />

    <div className="w-[185px] h-[37px] bg-white rounded-[10px] shadow-[0_0_2.3px_rgba(0,0,0,0.1)] flex items-center pl-[7px] pr-[12px]">
      <button
        type="button"
        className="text-[#080808] hover:opacity-70 cursor-pointer shrink-0"
        title="Notifications"
      >
        <Bell className="w-3 h-3" />
      </button>
      <img
        src={user.avatar}
        alt={user.name}
        className="w-7 h-7 rounded-[6.5px] object-cover ml-3 shrink-0"
      />
      <div className="ml-1 leading-[13px] min-w-0">
        <p className="text-[11px] font-medium text-[#080808] truncate">
          {user.name}
        </p>
        <p className="text-[11px] text-[rgba(68,67,67,0.75)] truncate">
          {user.email}
        </p>
      </div>
    </div>
  </header>
);

export default Header;
