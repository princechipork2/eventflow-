import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mmzzsojmdkarbsbvkilq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tenpzb2ptZGthcmJzYnZraWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMDgyNzAsImV4cCI6MjA5OTg4NDI3MH0.d4axt7J4fuZmmdXDrrAFC40J1KfuaJzR3psEiQsHSOQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)