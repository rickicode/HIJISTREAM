export default function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-3 text-sm cursor-pointer transition-all -mb-[1px] ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-gray-900 font-medium'
              : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
