import { Search, ChevronDown, X } from 'lucide-react';

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
  label,
  icon: Icon,
  value,
  onChange = () => {},
  options = [],
  disabled = false,
  containerClassName = '',
  className = '',
  caretClassName = '',
}) => (
  <div className={`relative flex flex-col justify-center ${containerClassName}`}>
    {label && (
      <label className="text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 text-[#558066]" />}
        {label}
      </label>
    )}
    <div className="relative flex items-center w-full h-full">
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
      <ChevronDown className={`w-4 h-4 text-[#080808] absolute right-2.5 pointer-events-none ${caretClassName}`} strokeWidth={2.5} />
    </div>
  </div>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  onClick = () => {},
  type = 'button',
  title,
}) => {
  const base = 'inline-flex items-center justify-center font-medium transition-all cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#86af96] text-[#080808] hover:bg-[#729e83] shadow-xs',
    danger: 'bg-[#fee2e2] text-[#b91c1c] hover:bg-[#fecaca]',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-xs gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon className="w-3.5 h-3.5" />
      )}
      {children}
    </button>
  );
};

export const Input = ({
  label,
  hint,
  icon: Icon,
  required = false,
  type = 'text',
  value = '',
  onChange = () => {},
  onBlur,
  name,
  error,
  placeholder = '',
  disabled = false,
  className = '',
}) => (
  <div>
    {label && (
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-medium text-zinc-700 flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3 text-[#558066]" />}
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[10px] text-zinc-400">{hint}</span>}
      </div>
    )}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={`w-full px-3 py-2 text-xs bg-white border ${
        error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#86af96]'
      } rounded-xl shadow-xs outline-none disabled:bg-gray-50 ${className}`}
    />
    {error && <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>}
  </div>
);

export const Modal = ({
  isOpen = false,
  onClose = () => {},
  maxWidth = 'max-w-md',
  icon: Icon,
  title,
  subtitle,
  headerContent,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 rounded-xl bg-[#86af96]/20 text-[#2d563c]">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              {title && <h3 className="text-sm font-bold text-zinc-900 leading-snug">{title}</h3>}
              {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
            </div>
            {headerContent}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
