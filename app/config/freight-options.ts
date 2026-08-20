export const DIRECTIONS = ['Import', 'Export'] as const
export const CURRENCIES = ['USD', 'KHR', 'VND'] as const
export const CONTAINER_TYPES = ['20GP', '40GP', '40HC', '45GP', '45HC'] as const
export const TRUCK_TYPES = ['1.5T', '2T', '3.5T', '5T', '8T'] as const
export const TRANSPORT_MODES = ['Road', 'Sea', 'Air', 'Rail'] as const
export const TRANSPORT_BY = ['Truck', 'Sea', 'Air', 'Rail'] as const
export const ACTIVE_STATUS = ['Active', 'Inactive'] as const
export const PAYMENT_STATUS = ['Unpaid', 'Partial', 'Paid', 'Overdue'] as const
export const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Cheque'] as const
export const SERVICE_TYPES = [
  'Trucking',
  'Customs',
  'Vietnam Service',
  'Cambodia Service',
  'Container Service',
  'Other',
] as const

export const JOB_STATUS = [
  'Job Created',
  'Documents Received',
  'Transport Registered',
  'Customs Processing',
  'Customs Cleared',
  'In Transit',
  'Arrived Factory',
  'Delivered',
  'Financial Completed',
  'Closed',
] as const

export const CUSTOMS_STATUS = ['Preparing', 'Submitted', 'Processing', 'On Hold', 'Cleared'] as const
export const QUOTATION_STATUS = ['Draft', 'Approved', 'Sent', 'Accepted', 'Expired'] as const
export const DEBIT_NOTE_STATUS = ['Draft', 'Approved', 'Sent', 'Partial', 'Paid'] as const
export const SHIPMENT_STATUS = ['Scheduled', 'Registered', 'In Transit', 'Arrived', 'Completed'] as const
export const DELIVERY_STATUS = ['Scheduled', 'Arriving', 'Unloading', 'Delivered', 'POD Received'] as const
export const DOCUMENT_STATUS = ['Required', 'Missing', 'Uploaded', 'Approved'] as const

export const DOCUMENT_TYPES = [
  'SO',
  'Invoice',
  'Packing List',
  'B/L',
  'Patent',
  'Truck Bill',
  'Customs Declaration',
  'Customs Fee Receipt',
  'Seal Document',
  'Debit Note',
  'Payment Advice',
  'POD',
  'Other',
] as const

export const JOB_CHECKLIST_TYPES = [
  'SO',
  'Invoice',
  'Packing List',
  'B/L',
  'Patent',
  'Transport Document',
  'Customs Declaration',
  'Customs Fee Receipt',
  'POD',
] as const

export const USER_ROLES = [
  'Administrator',
  'Management',
  'Sales',
  'Operations',
  'Customs',
  'Finance',
  'Data / Reporting',
  'Read Only',
] as const

export const DEBIT_CHARGE_TYPES = [
  'Customs Clearance Fee',
  'Weight Station Charge',
  'Customs Seal',
  'Second Document Fee',
  'Overtime',
  'Infrastructure Fee',
  'Trucking Fee',
  'Fuel Surcharge',
  'Moc Bai Gate In / Out',
  'Lift On / Off',
  'Extra Return Container',
  'Cai Mep Yard Transfer',
  'Overnight / Standby',
  'Empty Container Pickup Fee',
  'Local Charge',
  'Customs Declaration Modification Fee',
  'Fine',
  'Other',
] as const

export const QUOTATION_CONDITIONS = [
  'Inspection Fee',
  'Standby Fee',
  'Extra Customs Sheet',
  'Carrier Local Charges',
  'Port Charges',
  'Lift On / Lift Off',
  'Extra Trucking Fee',
  'Customs Charges',
  'Fuel Surcharge',
] as const

export const LOCATION_TYPES = ['Port', 'Border', 'Factory', 'Yard', 'Warehouse', 'City'] as const
export const EQUIPMENT_CATEGORIES = ['Container', 'Truck'] as const
export const CHARGE_CATEGORIES = ['Customs', 'Trucking', 'Vietnam', 'Cambodia', 'Port', 'Other'] as const
export const COUNTRIES = ['Cambodia', 'Vietnam'] as const
