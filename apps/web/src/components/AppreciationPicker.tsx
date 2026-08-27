import { useState, useRef, useEffect } from 'react';
import { Heart, Sparkles, BookOpen, Feather, Star, Flame, Coffee, Crown, Zap } from 'lucide-react';

// Writer/Artist themed appreciations (not Facebook reactions)
const APPRECIATIONS = [
  { 
    type: 'inspiring', 
    icon: Sparkles, 
    label: 'Inspiring',
    description: 'Moved me to create',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950'
  },
  { 
    type: 'beautiful', 
    icon: Feather, 
    label: 'Beautiful',
    description: 'Elegant and graceful',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950'
  },
  { 
    type: 'insightful', 
    icon: BookOpen, 
    label: 'Insightful',
    description: 'Made me think deeply',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950'
  },
  { 
    type: 'brave', 
    icon: Flame, 
    label: 'Brave',
    description: 'Fearless expression',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950'
  },
  { 
    type: 'masterpiece', 
    icon: Crown, 
    label: 'Masterpiece',
    description: 'Exceptional work',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950'
  },
  { 
    type: 'helpful', 
    icon: Coffee, 
    label: 'Helpful',
    description: 'Useful advice',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950'
  },
  { 
    type: 'energizing', 
    icon: Zap, 
    label: 'Energizing',
    description: 'Lit a fire in me',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950'
  },
  { 
    type: 'heartfelt', 
    icon: Heart, 
    label: 'Heartfelt',
    description: 'Emotionally touching',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950'
  }
];

interface AppreciationPickerProps {
  postId: string;
  currentAppreciation?: string | null;
  count?: number;
  onAppreciate: (type: string) => void;
}

export function AppreciationPicker({ 
  postId, 
  currentAppreciation, 
  count = 0, 
  onAppreciate 
}: AppreciationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(currentAppreciation || null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAppreciate = async (type: string) => {
    // If same type, remove appreciation (toggle off)
    const newType = selectedType === type ? null : type;
    setSelectedType(newType);
    onAppreciate(newType || type);
    setIsOpen(false);
  };

  const getCurrentIcon = () => {
    const appreciation = APPRECIATIONS.find(a => a.type === selectedType);
    if (appreciation) {
      const Icon = appreciation.icon;
      return <Icon className={`w-4 h-4 ${appreciation.color}`} />;
    }
    return <Heart className="w-4 h-4" />;
  };

  const getTotalCount = () => {
    return count + (selectedType ? 1 : 0);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
          selectedType 
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
            : 'text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        {getCurrentIcon()}
        <span>Appreciate</span>
        {getTotalCount() > 0 && (
          <span className="text-xs font-medium ml-0.5">{getTotalCount()}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50 min-w-[280px]">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
            How did this make you feel?
          </p>
          <div className="grid grid-cols-4 gap-1">
            {APPRECIATIONS.map((appreciation) => {
              const Icon = appreciation.icon;
              const isSelected = selectedType === appreciation.type;
              const isHovered = hoveredType === appreciation.type;
              
              return (
                <button
                  key={appreciation.type}
                  onClick={() => handleAppreciate(appreciation.type)}
                  onMouseEnter={() => setHoveredType(appreciation.type)}
                  onMouseLeave={() => setHoveredType(null)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    isSelected
                      ? appreciation.bgColor
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${appreciation.color} transition-transform ${isHovered ? 'scale-110' : ''}`} />
                  <span className="text-xs font-medium">{appreciation.label}</span>
                  {isHovered && (
                    <span className="text-[10px] text-gray-400 text-center">
                      {appreciation.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Show who appreciated recently (optional) */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 text-center">
              {count + (selectedType ? 1 : 0)} writers appreciated this
            </p>
          </div>
        </div>
      )}
    </div>
  );
      }
