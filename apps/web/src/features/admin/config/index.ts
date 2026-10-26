import { catalogModules } from "./catalog";
import { purchaseModules } from "./purchases";
import { operationModules } from "./operations";
import type { ModuleConfig } from "../types";
export const modules: Record<string, ModuleConfig> = {
  ...catalogModules,
  ...purchaseModules,
  ...operationModules,
};
