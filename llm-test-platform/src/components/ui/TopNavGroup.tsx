import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: any
  desc: string
}

interface TopNavGroupProps {
  label: string
  items: NavItem[]
}

export function TopNavGroup({ label, items }: TopNavGroupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const timeoutRef = useRef<NodeJS.Timeout>()

  const isActive = items.some(item => location.pathname === item.href)

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-[14px] font-medium transition-colors rounded-md",
          isActive || isOpen ? "text-primary bg-primary/5" : "text-textSec hover:text-textMain hover:bg-pageBg"
        )}
      >
        {label}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 pt-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-cardBg border border-border shadow-lg rounded-lg p-2 flex flex-col gap-1">
            {items.map(item => {
              const isItemActive = location.pathname === item.href
              return (
                <Link 
                  key={item.href} 
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-md transition-all group hover:bg-primary/5",
                    isItemActive ? "bg-primary/5" : ""
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-md mt-0.5",
                    isItemActive ? "bg-primary text-white shadow-sm" : "bg-pageBg text-textSec group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={cn(
                      "text-[14px] font-semibold mb-0.5",
                      isItemActive ? "text-primary" : "text-textMain group-hover:text-primary"
                    )}>
                      {item.name}
                    </div>
                    <div className="text-[12px] text-textMuted line-clamp-1">
                      {item.desc}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
