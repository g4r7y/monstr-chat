import { createContext, useContext } from 'react';

export type AppViewNameType =
  | 'start'
  | 'welcome'
  | 'chats'
  | 'friends'
  | 'settings'
  | 'settings#profile'
  | 'settings#relays'
  | 'settings#keys'
  | 'conversation'
  | 'add-friend'
  | 'view-friend'
  | 'find-friend'
  | 'create-group'
  | 'edit-profile'
  | 'edit-message-relays'
  | 'edit-general-relays';

// Represents a view and its state
export type AppViewType = {
  name: AppViewNameType;
  contactGroup?: string[];
  selectedContactNpub?: string;
};

// Define the type to be used with the context
interface AppViewContextType {
  currentView: () => AppViewType;
  switchView: (viewName: AppViewNameType) => void;
  pushView: (viewName: AppViewNameType, contacts?: string[], selectedContactIndex?: number) => void;
  popView: () => void;
}

// The context object
const AppViewContext = createContext<AppViewContextType | null>(null);

// Returns the app view object from the context
// This can be used to check the current view or to switch to another view.
const useAppView = (): AppViewContextType => {
  const contextValue = useContext(AppViewContext);
  if (!contextValue) {
    throw new Error('AppViewContext does not have a value. useAppView() must be used within an AppViewProvider');
  }
  return contextValue;
};

export { AppViewContext, useAppView };
