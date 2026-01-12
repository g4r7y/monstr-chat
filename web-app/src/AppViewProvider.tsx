import { useState } from "react";
import { AppViewContext, type AppViewNameType } from "./appViewContext";

// Define the provider props type
interface AppViewProviderProps {
  children: React.ReactNode;
}


const AppViewProvider: React.FunctionComponent<AppViewProviderProps> = ( { children } ) => {
  const [view, setView] = useState('main' as AppViewNameType);
  const [currentContact, setCurrentContact] = useState('');

  const switchView = (newView: AppViewNameType, contactNpub?: string) => {
    setView(newView);
    contactNpub && setCurrentContact(contactNpub)
  };

  return (
    <AppViewContext.Provider value={{ view, currentContact, switchView }}>
      {children}
    </AppViewContext.Provider>
  );
};

export { AppViewProvider }