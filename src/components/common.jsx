import { Search, ChevronDown } from 'lucide-react';

export const SearchInput = ({
  value = '',
  onChange = () => {},
  onEnter,
  placeholder = 'Search...',
  containerClassName = '',
  className = '',
}) => (
  <div className={`relative flex items-center bg-white rounded-[10px] shadow-[0_0_2.3px_rgba(0,0,0,0.1)] px-3 ${containerClassName}`}>
    <Search className="w-3.5 h-3.5 text-[#7a7a7a] shrink-0 mr-2" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={(e) => e.key === 'Enter' && onEnter && onEnter()}
      placeholder={placeholder}
      className={`w-full bg-transparent text-[12px] text-[#080808] placeholder-[rgba(68,67,67,0.7)] outline-none ${className}`}
    />
  </div>
);

export const Select = ({
  value,
  onChange = () => {},
  options = [],
  disabled = false,
  containerClassName = '',
  className = '',
  caretClassName = '',
}) => (
  <div className={`relative flex items-center ${containerClassName}`}>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full h-full appearance-none bg-white rounded-[10px] pl-3 pr-7 text-[12px] text-[#080808] shadow-[0_0_2.3px_rgba(0,0,0,0.1)] outline-none cursor-pointer disabled:opacity-50 ${className}`}
    >
      {options.map((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lbl = typeof opt === 'object' ? opt.label : opt;
        return (
          <option key={val} value={val}>
            {lbl}
          </option>
        );
      })}
    </select>
    <ChevronDown className={`w-3.5 h-3.5 text-[#7a7a7a] absolute right-2.5 pointer-events-none ${caretClassName}`} />
  </div>
);

export const Button = ({
  children,
  icon: Icon,
  disabled = false,
  className = '',
  onClick = () => {},
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center font-medium transition-all rounded-lg px-4 py-2 text-xs gap-2 bg-[#86af96] text-[#080808] hover:bg-[#729e83] shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {Icon && <Icon className={`w-3.5 h-3.5 ${disabled ? 'animate-spin' : ''}`} />}
    {children}
  </button>
);
