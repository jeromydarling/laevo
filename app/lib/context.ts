import { createContext } from "react-router";
import type { AppContext } from "./env";

/**
 * React Router v8 hands loaders a RouterContextProvider rather than a plain
 * object, so the Worker bindings ride along in a typed context key.
 */
export const appContext = createContext<AppContext>();
