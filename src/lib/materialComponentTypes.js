// Shared default "component use" values for MaterialPriceList.component_type.
// Now references product types (Railing, Staircase, Gate, etc.) so a material
// can be tagged for multiple product types it's used in.
import { JOB_DETAIL_DEFAULTS } from "@/lib/jobDetailDefaults";
export const DEFAULT_COMPONENT_TYPES = JOB_DETAIL_DEFAULTS.products;