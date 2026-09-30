import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bwirmonybyjayqgvhqno.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_qtFiu5XnjVdqYoH16Z0EnQ_w21i2a4s'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
