export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-2 p-1 bg-[#1A1A1A] rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm cursor-pointer rounded-lg transition-colors ${
            activeTab === tab.id
              ? 'bg-[#6366F1] text-white font-medium'
              : 'text-[#A1A1A1] hover:text-white hover:bg-[#262626]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
