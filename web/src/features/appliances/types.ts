// Mirrors internal/data.Appliance JSON tags (snake_case, server-generated id).
export interface Appliance {
  id: string
  name: string
  brand: string
  model_number: string
  serial_number: string
  purchase_date: string | null
  warranty_expiry: string | null
  location: string
  cost_cents: number | null
  notes: string
  created_at: string
  updated_at: string
}

export interface ApplianceInput {
  name: string
  brand: string
  location: string
  model_number: string
  serial_number: string
  purchase_date: string | null
  notes: string
}

export function toInput(a: Appliance): ApplianceInput {
  return {
    name: a.name,
    brand: a.brand,
    location: a.location,
    model_number: a.model_number,
    serial_number: a.serial_number,
    purchase_date: a.purchase_date,
    notes: a.notes,
  }
}

export const emptyInput: ApplianceInput = {
  name: '',
  brand: '',
  location: '',
  model_number: '',
  serial_number: '',
  purchase_date: null,
  notes: '',
}
