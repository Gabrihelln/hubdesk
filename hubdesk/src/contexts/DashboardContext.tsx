import React, { createContext, useContext, useState } from 'react';

interface DashboardContextType {
  isDraggable: boolean;
  setIsDraggable: (value: boolean) => void;
  resetSignal: number;
  triggerReset: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isDraggable, setIsDraggable] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const triggerReset = () => {
    setResetSignal(prev => prev + 1);
  };

  return (
    <DashboardContext.Provider value={{ isDraggable, setIsDraggable, resetSignal, triggerReset }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  return context;
}
