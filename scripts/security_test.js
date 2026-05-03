import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://mbaldfltjcjlsrhntteh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYWxkZmx0amNqbHNyaG50dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTQ2NDY0MDAsImV4cCI6MjAzMDIyMjQwMH0.xxx'; // Using the one from user or project

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSecurityTests() {
  console.log("🛡️ Starting Security Audit...");

  // Test 1: Unauthorized Coin Grant
  console.log("\nTest 1: Attempting unauthorized grant_coins...");
  const { error: err1 } = await supabase.rpc('grant_coins', { 
    target_user: '00000000-0000-0000-0000-000000000000', 
    amount: 999999 
  });
  if (err1) {
    console.log("✅ Blocked: " + err1.message);
  } else {
    console.log("❌ VULNERABILITY: grant_coins is accessible to anonymous users!");
  }

  // Test 2: Unauthorized Role Change
  console.log("\nTest 2: Attempting unauthorized set_user_role...");
  const { error: err2 } = await supabase.rpc('set_user_role', { 
    p_user_id: '00000000-0000-0000-0000-000000000000', 
    p_role: 'super_admin' 
  });
  if (err2) {
    console.log("✅ Blocked: " + err2.message);
  } else {
    console.log("❌ VULNERABILITY: set_user_role is accessible to anonymous users!");
  }

  // Test 3: Unauthorized Tournament Deletion
  console.log("\nTest 3: Attempting unauthorized delete_tournament_complete...");
  const { error: err3 } = await supabase.rpc('delete_tournament_complete', { 
    p_tournament_id: '00000000-0000-0000-0000-000000000000' 
  });
  if (err3) {
    console.log("✅ Blocked: " + err3.message);
  } else {
    console.log("❌ VULNERABILITY: delete_tournament_complete is accessible to anonymous users!");
  }

  console.log("\n✨ Security Audit Completed.");
}

runSecurityTests();
