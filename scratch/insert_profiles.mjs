import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres.mcqdqluxprpmrgofynaa:U%21tp.9xxx2%23nYeF@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
})

const sql = `
INSERT INTO public.profiles (id, username, email)
SELECT id, 'dikydwi442', email FROM auth.users WHERE email = 'dikydwi442@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, email)
SELECT id, 'dzakyzr3', email FROM auth.users WHERE email = 'dzakyzr3@gmail.com'
ON CONFLICT (id) DO NOTHING;
`

async function run() {
  try {
    await client.connect()
    await client.query(sql)
    console.log('Profiles inserted successfully!')
  } catch(e) {
    console.error(e)
  } finally {
    await client.end()
  }
}

run()
