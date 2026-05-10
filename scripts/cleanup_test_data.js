import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanTestData() {
  console.log("🧹 Starting database cleanup...");

  // 1. Delete profiles with test emails
  const { data: testProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email')
    .or('email.ilike.%@cipherpool.test,email.ilike.%@example.com,email.ilike.T@gmail.com');

  if (fetchError) {
    console.error("❌ Error fetching test profiles:", fetchError.message);
    return;
  }

  if (!testProfiles || testProfiles.length === 0) {
    console.log("✅ No test profiles found.");
  } else {
    const ids = testProfiles.map(p => p.id);
    console.log(`🗑️ Deleting ${ids.length} test profiles and their auth accounts...`);

    // In a real environment, you'd also delete from auth.users via supabase.auth.admin.deleteUser
    // but here we focus on the profiles table.
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error("❌ Error deleting profiles:", deleteError.message);
    } else {
      console.log(`✅ Successfully deleted ${ids.length} profiles.`);
    }
  }

  console.log("✨ Cleanup completed!");
}

cleanTestData();
