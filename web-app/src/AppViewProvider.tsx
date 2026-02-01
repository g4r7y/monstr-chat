import { useState } from "react";
import { AppViewContext, type AppViewNameType } from "./appViewContext";

// Define the provider props type
interface AppViewProviderProps {
  children: React.ReactNode;
}


const AppViewProvider: React.FunctionComponent<AppViewProviderProps> = ( { children } ) => {
  const [view, setView] = useState('main' as AppViewNameType);
  const [currentContactNpub, setCurrentContactNpub] = useState('');

  const switchView = (newView: AppViewNameType, contactNpub?: string) => {
    contactNpub ? setCurrentContactNpub(contactNpub) : setCurrentContactNpub('')
    setView(newView);
  };

  return (
    <AppViewContext.Provider value={{ view, currentContactNpub, switchView }}>
      {children}
    </AppViewContext.Provider>
  );
};

export { AppViewProvider }