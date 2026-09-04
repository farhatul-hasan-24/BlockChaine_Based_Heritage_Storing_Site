import { createContext, useContext, useState, type ReactNode } from "react";

export type Page = "home" | "market" | "register" | "dashboard" | "admin" | "artifact";

export interface Route {
  page: Page;
  id?: number;
  filter?: string;
}

interface RouterCtx {
  route: Route;
  go: (page: Page, id?: number, filter?: string) => void;
}

const Ctx = createContext<RouterCtx>({ route: { page: "home" }, go: () => {} });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ page: "home" });
  const go = (page: Page, id?: number, filter?: string) => {
    setRoute({ page, id, filter });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };
  return <Ctx.Provider value={{ route, go }}>{children}</Ctx.Provider>;
}

export function useRouter(): RouterCtx {
  return useContext(Ctx);
}
