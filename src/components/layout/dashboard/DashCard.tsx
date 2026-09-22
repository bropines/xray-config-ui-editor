import React from "react";
import { Icon } from "../../ui";

// Re-usable column Card for the dashboard
interface DashCardProps {
  title: string;
  icon: string;
  color: string;
  actions: React.ReactNode;
  subHeader?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * A dashboard section.
 *
 * On a desktop column it is a fixed-height box that scrolls its own content.
 * On a phone that shape is the problem: four of these stacked inside the page
 * scroller gives four independent scroll regions in one viewport, each showing
 * a few rows and clipping the next one mid-line. Below `md` the card grows to
 * fit instead, the page is the only thing that scrolls, and the header folds
 * the section away when you want to reach the one under it.
 */
export const DashCard = ({
  title,
  icon,
  color,
  children,
  actions,
  subHeader,
  className = "",
}: DashCardProps) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div
      className={`bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col hover:border-slate-600 transition-colors shadow-xl overflow-hidden ${className}`}
    >
      <div className="flex justify-between items-center py-2 px-3 md:px-4 border-b border-slate-700/50 bg-slate-800/50 shrink-0 min-h-[52px] gap-2">
        <button
          type="button"
          onClick={() => setCollapsed(open => !open)}
          className="flex items-center gap-2 md:gap-3 min-w-0 text-left md:cursor-default"
          aria-expanded={!collapsed}
        >
          <div className={`p-2 rounded-lg ${color} text-white shadow-lg shrink-0 flex items-center justify-center`}>
            <Icon name={icon} className="text-xl" />
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-100 tracking-tight truncate">{title}</h2>
          <Icon
            name={collapsed ? 'CaretRight' : 'CaretDown'}
            weight="bold"
            className="md:hidden text-slate-500 shrink-0"
          />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      </div>
      {!collapsed && subHeader}
      {/* `md:overflow-y-auto` and `md:min-h-0`: only the desktop card owns a
          scroll of its own. */}
      <div className={`${collapsed ? 'hidden md:block' : ''} flex-1 p-3 md:p-4 space-y-3 md:overflow-y-auto custom-scroll bg-slate-900/30 md:min-h-0`}>
        {children}
      </div>
    </div>
  );
};
