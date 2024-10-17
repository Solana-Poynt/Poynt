import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AdContextType {
  adWatched: boolean;
  setAdWatched: (watched: boolean) => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

interface AdProviderProps {
  children: ReactNode;
}

export const AdProvider: React.FC<AdProviderProps> = ({ children }) => {
  const [adWatched, setAdWatched] = useState(false);

  return <AdContext.Provider value={{ adWatched, setAdWatched }}>{children}</AdContext.Provider>;
};

export const useAdContext = () => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAdContext must be used within an AdProvider');
  }
  return context;
};
