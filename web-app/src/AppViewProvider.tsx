import { useState } from 'react';
import { AppViewContext, type AppViewNameType } from './appViewContext';

const initialView: AppViewNameType = 'start';

// Define the provider props type
interface AppViewProviderProps {
  children: React.ReactNode;
}

const AppViewProvider: React.FunctionComponent<AppViewProviderProps> = ({ children }) => {
  const [view, setView] = useState(initialView as AppViewNameType);
  const [currentContactNpub, setCurrentContactNpub] = useState('');
  const [currentContactGroup, setCurrentContactGroup] = useState([] as string[]);

  const switchView = (newView: AppViewNameType) => {
    setView(newView);
  };

  const switchViewWithContacts = (newView: AppViewNameType, contactNpubs: string[], current?: number) => {
    setCurrentContactGroup(contactNpubs);
    if (current !== undefined) {
      setCurrentContactNpub(contactNpubs[current]);
    }
    setView(newView);
  };

  return (
    <AppViewContext.Provider
      value={{ view, currentContactNpub, currentContactGroup, switchView, switchViewWithContacts }}
    >
      {children}
    </AppViewContext.Provider>
  );
};

export { AppViewProvider };
