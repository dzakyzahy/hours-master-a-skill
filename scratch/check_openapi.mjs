import dotenv from 'dotenv'
dotenv.config()

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/'
  const res = await fetch(url)
  const json = await res.json()
  console.log(JSON.stringify(json, null, 2))
}
run()
