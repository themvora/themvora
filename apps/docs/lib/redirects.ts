import { REDIRECTS as DATA } from "../redirects.mjs";

export type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean;
};

export const REDIRECTS = DATA as readonly RedirectRule[];
