import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = 'https://mbaldfltjcjlsrhntteh.supabase.co';
// Using the service role key to bypass RLS for seeding
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iYWxkZmx0amNqbHNyaG50dGVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNDY0NjQwMCwiZXhwIjoyMDMwMjIyNDAwfQ.xxx'; // Placeholder, I will use the real one if available or ask

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedUsers(count = 1000) { // Starting with 1000 for safety
  console.log(`🚀 Starting to seed ${count} users...`);
  
  const batchSize = 50;
  const batches = Math.ceil(count / batchSize);

  for (let i = 0; i < batches; i++) {
    const users = [];
    for (let j = 0; j < batchSize; j++) {
      const userId = crypto.randomUUID();
      const userNum = i * batchSize + j;
      users.push({
        id: userId,
        full_name: `Tester_${userNum}`,
        email: `testuser_${userNum}@cipherpool.test`,
        role: 'user',
        verification_status: 'verified',
        coins: Math.floor(Math.random() * 1000),
        xp: Math.floor(Math.random() * 500),
        created_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase.from('profiles').insert(users);
    
    if (error) {
      console.error(`❌ Error in batch ${i}:`, error.message);
      if (error.message.includes('service_role')) {
         console.log("⚠️ Need real service_role key to bypass RLS.");
         break;
      }
    } else {
      console.log(`✅ Batch ${i + 1}/${batches} inserted (${(i + 1) * batchSize} users)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log("✨ Seeding completed!");
}

seedUsers();
