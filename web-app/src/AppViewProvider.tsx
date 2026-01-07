import { useState } from "react";
import { AppViewContext, type AppViewNameType } from "./appViewContext";

// Define the provider props type
interface AppViewProviderProps {
  children: React.ReactNode;
}


const AppViewProvider: React.FunctionComponent<AppViewProviderProps> = ( { children } ) => {
  const [view, setView] = useState('main' as AppViewNameType);

  const switchView = (newView: AppViewNameType) => {
    setView(newView);
  };

  return (
    <AppViewContext.Provider value={{ view, switchView }}>
      {children}
    </AppViewContext.Provider>
  );
};

export { AppViewProvider }