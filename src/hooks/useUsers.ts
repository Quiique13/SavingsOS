import { useContext } from "react";
import { UsersContext, type UsersState } from "../context/UsersContext";

export function useUsers(): UsersState {
  const context = useContext(UsersContext);
  if (!context)
    throw new Error("User controls must be wrapped in UsersProvider.");
  return context;
}
