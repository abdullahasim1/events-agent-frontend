import { SearchInput } from "./common";

const Header = ({ globalSearch = "", onGlobalSearchChange = () => {} }) => (
  <header className="h-[37px] flex items-center justify-between select-none">
    <SearchInput
      value={globalSearch}
      onChange={(e) => onGlobalSearchChange(e.target.value)}
      placeholder="Search..."
      containerClassName="w-[263px] h-[37px] px-[13px]"
    />
  </header>
);

export default Header;
