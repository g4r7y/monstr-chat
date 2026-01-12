import { createContext, useContext } from 'react';

export type AppViewNameType = 'main' | 'conversation';

// Define the type to be used with the context
interface AppViewContextType {
  view: AppViewNameType;
  currentContact: string;
  switchView: (view: AppViewNameType, currentContact?: string) => void;
}

// The context object 
const AppViewContext = createContext<AppViewContextType | null>(null);

// Returns the app view object from the context
// This can be used to check the current view or to switch to another view.
const useAppView = () : AppViewContextType => {
  const contextValue = useContext(AppViewContext);
  if (!contextValue) {
    throw new Error('AppViewContext does not have a value. useAppView() must be used within an AppViewProvider');
  }
  return contextValue;
};

export { AppViewContext, useAppView };
