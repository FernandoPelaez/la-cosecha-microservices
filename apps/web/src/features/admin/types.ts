import type { RecordData } from "@/types";
export interface FieldSpec {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime-local"
    | "select"
    | "checkbox"
    | "items"
    | "multiselect";
  placeholder?: string;
  required?: boolean;
  max?: number;
  min?: number;
  step?: string;
  options?: { value: string; label: string }[];
  source?: string;
  sourceLabel?: string;
  default?: unknown;
}
export interface ModuleConfig {
  title: string;
  subtitle: string;
  endpoint: string;
  writeEndpoint?: string;
  roles: string[];
  columns: { key: string; label: string; money?: boolean }[];
  fields?: FieldSpec[];
  editFields?: (row: RecordData) => FieldSpec[];
  create?: boolean;
  edit?: boolean;
  remove?: boolean;
  editMethod?: "PUT" | "PATCH" | "POST";
  editPath?: (row: RecordData) => string;
  transform?: (value: RecordData) => unknown;
  filter?: (row: RecordData) => boolean;
  actionRoles?: string[];
  action?: (row: RecordData) => {
    label: string;
    path: string;
    method: string;
    body?: unknown;
    variant: "edit" | "send" | "save";
  } | null;
  detailEndpoint?: string;
}
