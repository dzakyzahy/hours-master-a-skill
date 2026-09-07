import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres.mcqdqluxprpmrgofynaa:U%21tp.9xxx2%23nYeF@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
})

const sql = `
UPDATE auth.users 
SET encrypted_password = crypt('zahy123hours', gen_salt('bf')) 
WHERE email = 'dzakyzr3@gmail.com';

UPDATE auth.users 
SET encrypted_password = crypt('diky123hours', gen_salt('bf')) 
WHERE email = 'dikydwi442@gmail.com';
`

async function run() {
  try {
    await client.connect()
    await client.query(sql)
    console.log('Passwords updated successfully!')
  } catch(e) {
    console.error(e)
  } finally {
    await client.end()
  }
}

run()
