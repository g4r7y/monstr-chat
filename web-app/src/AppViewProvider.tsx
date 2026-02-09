import { useState } from "react";
import { AppViewContext, type AppViewNameType } from "./appViewContext";

const initialView: AppViewNameType = 'start'

// Define the provider props type
interface AppViewProviderProps {
  children: React.ReactNode;
}

const AppViewProvider: React.FunctionComponent<AppViewProviderProps> = ( { children } ) => {
  const [view, setView] = useState(initialView as AppViewNameType);
  const [currentContactNpub, setCurrentContactNpub] = useState('');

  const switchView = (newView: AppViewNameType, contactNpub?: string) => {
    setCurrentContactNpub(contactNpub ?? '')
    setView(newView);
  };

  return (
    <AppViewContext.Provider value={{ view, currentContactNpub, switchView }}>
      {children}
    </AppViewContext.Provider>
  );
};

export { AppViewProvider }