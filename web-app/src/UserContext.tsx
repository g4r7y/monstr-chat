import { createContext, useState } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React from 'react'

interface User {
  name: string;
  email: string;
}



interface UserContextProps {
  children: ReactNode;
}

interface UserContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const UserProvider: React.FunctionComponent<UserContextProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserProvider, UserContext };