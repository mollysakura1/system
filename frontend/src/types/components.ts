export interface TableColumn {
  prop: string;
  label: string;
  minWidth?: number;
  width?: number;
  slot?: string;
}

export interface SearchField {
  prop: string;
  label: string;
  type?: 'input' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
}

export interface FormField {
  prop: string;
  label: string;
  type?: 'input' | 'select' | 'textarea' | 'switch';
  placeholder?: string;
  options?: Array<{ label: string; value: string | number | boolean }>;
}
