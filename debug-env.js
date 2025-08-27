// 🔍 Script de debug pour examiner le fichier .env
import fs from 'fs'

console.log('🔍 Debug du fichier .env')
console.log('========================')

try {
  const envContent = fs.readFileSync('.env', 'utf8')
  console.log('📄 Contenu brut du fichier:')
  console.log('---DÉBUT---')
  console.log(envContent)
  console.log('---FIN---')
  
  console.log('\n🔍 Analyse ligne par ligne:')
  const lines = envContent.split('\n')
  lines.forEach((line, index) => {
    console.log(`Ligne ${index + 1}: "${line}"`)
    if (line.includes('=')) {
      const parts = line.split('=', 2)
      console.log(`  → Clé: "${parts[0].trim()}"`)
      console.log(`  → Valeur: "${parts[1].trim()}"`)
    }
  })
  
  console.log('\n🔍 Variables trouvées:')
  const envVars = {}
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=', 2)
      const cleanKey = key.trim()
      const cleanValue = value.trim()
      envVars[cleanKey] = cleanValue
      console.log(`✅ ${cleanKey} = ${cleanValue.substring(0, 20)}...`)
    }
  })
  
  console.log('\n🔍 Vérification des variables requises:')
  console.log('VITE_SUPABASE_URL:', envVars.VITE_SUPABASE_URL ? '✅' : '❌')
  console.log('VITE_SUPABASE_ANON_KEY:', envVars.VITE_SUPABASE_ANON_KEY ? '✅' : '❌')
  
} catch (error) {
  console.error('❌ Erreur:', error.message)
}
