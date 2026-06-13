// Convenience aliases over the Supabase-generated Database types.
// Regenerate database.types.ts after schema changes with:
//   mcp supabase generate_typescript_types
import type { Database } from "@/lib/database.types";

export type { Database };

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type UserRow = Tables["users"]["Row"];
export type PortfolioRow = Tables["portfolios"]["Row"];
export type JobRow = Tables["jobs"]["Row"];
export type ApplicationRow = Tables["applications"]["Row"];
export type DealRequestRow = Tables["deal_requests"]["Row"];
export type DealMessageRow = Tables["deal_messages"]["Row"];
export type OrderRow = Tables["orders"]["Row"];
export type TransactionRow = Tables["transactions"]["Row"];
export type DeliverableRow = Tables["deliverables"]["Row"];
export type NotificationRow = Tables["notifications"]["Row"];

export type UserRole = Enums["user_role"];
export type JobStatus = Enums["job_status"];
export type ApplicationStatus = Enums["application_status"];
export type DealStatus = Enums["deal_status"];
export type OrderStatus = Enums["order_status"];
export type TxType = Enums["tx_type"];
export type TxStatus = Enums["tx_status"];
