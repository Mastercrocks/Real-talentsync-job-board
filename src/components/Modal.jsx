import React, { useEffect } from 'react'

export default function Modal ({ children, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-3xl w-full mx-4 bg-gray-900 rounded-lg shadow-xl p-4 border border-gray-700">
        <button className="absolute top-3 right-3 text-gray-300 hover:text-white" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  )
}
