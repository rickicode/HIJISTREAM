import { cn } from '@/lib/utils';

export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'pb-2 text-sm cursor-pointer whitespace-nowrap transition-colors border-b-2',
            activeTab === tab.id
              ? 'text-white font-medium border-primary'
              : 'text-muted-foreground hover:text-white border-transparent'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
