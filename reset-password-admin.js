/**
 * Script pour réinitialiser le mot de passe admin depuis Supabase
 * 
 * Utilisation dans la console du navigateur sur https://supabase.com/dashboard
 * 
 * Instructions:
 * 1. Ouvrez https://supabase.com/dashboard
 * 2. Sélectionnez votre projet
 * 3. Allez dans Authentication > Users
 * 4. Trouvez l'utilisateur florent.lambert@gmail.com
 * 5. Ouvrez la console du navigateur (F12)
 * 6. Collez ce script et exécutez
 */

const resetPasswordForUser = async () => {
  // Remplacez par votre email admin
  const userEmail = 'florent.lambert@gmail.com';
  
  // Récupérer l'ID utilisateur
  const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
  
  if (fetchError) {
    console.error('Erreur:', fetchError);
    return;
  }
  
  const user = users.users.find(u => u.email === userEmail);
  
  if (!user) {
    console.error('Utilisateur non trouvé:', userEmail);
    return;
  }
  
  console.log('Utilisateur trouvé:', user.id, user.email);
  
  // Générer un nouveau lien de réinitialisation
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: userEmail
  });
  
  if (error) {
    console.error('Erreur génération lien:', error);
    return;
  }
  
  console.log('✅ Lien de réinitialisation généré:');
  console.log(data.properties.action_link);
  console.log('\nCopiez ce lien et ouvrez-le dans votre navigateur.');
};

// Exécuter la fonction
resetPasswordForUser();

