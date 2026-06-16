"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function CustomSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input-field"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          background: 'white',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border)',
          boxShadow: isOpen ? '0 0 0 3px rgba(11, 37, 69, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ color: selectedOption ? 'var(--foreground)' : '#94a3b8', fontWeight: selectedOption ? '500' : '400' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: isOpen ? 'var(--primary)' : 'var(--muted-foreground)', 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }} 
        />
      </div>

      <div style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        maxHeight: '280px',
        overflowY: 'auto',
        padding: '6px',
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
        transformOrigin: 'top center',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}>
        {options.length === 0 && (
          <div style={{ padding: '8px 12px', color: 'var(--muted-foreground)', fontSize: '13px', textAlign: 'center', fontStyle: 'italic' }}>
            Aucune option disponible
          </div>
        )}
        {options.map((opt) => (
          <div
            key={opt.value}
            onClick={() => {
              onChange(opt.value);
              setIsOpen(false);
            }}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '14px',
              background: value === opt.value ? 'var(--accent)' : 'transparent',
              color: value === opt.value ? 'var(--primary)' : 'var(--foreground)',
              fontWeight: value === opt.value ? '600' : '400',
              transition: 'background 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onMouseEnter={(e) => {
              if (value !== opt.value) e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              if (value !== opt.value) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span>{opt.label}</span>
            {value === opt.value && (
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
