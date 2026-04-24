import { useState } from 'react';
import { AppViewContext, type AppViewNameType, type AppViewType } from './appViewContext';

const initialView: AppViewNameType = 'start';

// Define the provider props type
interface AppViewProviderProps {
  children: React.ReactNode;
}

const AppViewProvider: React.FunctionComponent<AppViewProviderProps> = ({ children }) => {
  const [viewStack, setViewStack] = useState<AppViewType[]>([{ name: initialView }]);

  const currentView = (): AppViewType => {
    return viewStack[viewStack.length - 1];
  };

  /**
   * Switch view, resetting the stack. Use this when navigating to top level view.
   * @param viewName
   */
  const switchView = (viewName: AppViewNameType) => {
    setViewStack([{ name: viewName }]);
  };

  /**
   * Push a new view to the stack. Use this to go to a new view, so that subsequent back journey can return to previous view.
   * @param viewName - Id of the view to push
   * @param contacts - Optional list of npubs which represent the current contact or contact group
   * @param selectedContactIndex - Optional index of the the currently selected contact
   */
  const pushView = (viewName: AppViewNameType, contacts?: string[], selectedContactIndex?: number) => {
    const newView: AppViewType = {
      name: viewName,
      contactGroup: contacts ?? undefined,
      selectedContactNpub:
        contacts &&
        selectedContactIndex !== undefined &&
        selectedContactIndex >= 0 &&
        selectedContactIndex < contacts.length
          ? contacts[selectedContactIndex]
          : undefined
    };
    setViewStack(prevViewStack => [...prevViewStack, newView]);
  };

  /**
   * Pop the view from the stack. Use this to go back to previous view.
   */
  const popView = () => {
    if (viewStack.length > 0) {
      setViewStack(prevViewStack => prevViewStack.slice(0, -1));
    }
  };

  return (
    <AppViewContext.Provider value={{ currentView, switchView, pushView, popView }}>{children}</AppViewContext.Provider>
  );
};

export { AppViewProvider };
