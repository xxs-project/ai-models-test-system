import { useEffect, useRef } from 'react'

export function ResourceCalc() {
  return (
    <div className="w-full h-[calc(100vh-6rem)] -mt-2">
      <iframe 
        src="/vram-calc/index.html" 
        className="w-full h-full border-none rounded-lg shadow-sm bg-[#f1f5f9]"
        title="资源测算"
      />
    </div>
  )
}
