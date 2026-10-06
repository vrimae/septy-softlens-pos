const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:XzLwyNF1gP917Rzw@db.llmnezadufgljqcwkjlh.supabase.co:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    
    await client.query(\
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    \);
    console.log('Successfully dropped foreign key constraint on profiles.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

run();
