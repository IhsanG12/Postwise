import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Untyped view of the same client, for table queries. The hand-written
// Database type in types.ts doesn't model every column the migrations add,
// so query results are typed at each call site instead (`as { data: … }`).
// One named escape hatch here instead of `supabase as any` in every file.
export type Db = SupabaseClient;
export const db: Db = supabase as unknown as Db;
