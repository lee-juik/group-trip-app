import { createContext, useContext } from 'react';

export const UIContext = createContext<{ openMembers: () => void }>({ openMembers: () => {} });
export const useUI = () => useContext(UIContext);
