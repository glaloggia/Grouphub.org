
// Use require for packages that might not be in the default TS path for scripts
const admin = require('firebase-admin');
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// This script needs to be run with proper Firebase Admin credentials.
// It will not work in a client-side environment.
// Before running, ensure you have your Firebase service account JSON file.
// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable:
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
// Then run: ts-node scripts/seed-users.ts

// --- Dummy User Data ---
const dummyUsers: { email: string; password: string; displayName: string; interests: string[] }[] = [];
const interestsList = [
    ['hiking', 'photography', 'reading'],
    ['gaming', 'cooking', 'movies'],
    ['coding', 'music', 'travel'],
    ['art', 'yoga', 'gardening'],
    ['sports', 'cars', 'tech'],
    ['fashion', 'baking', 'dancing'],
    ['history', 'chess', 'podcasts'],
    ['running', 'animals', 'volunteering'],
    ['science', 'astronomy', 'robotics'],
    ['writing', 'theater', 'coffee'],
    ['board games', 'diy', 'finance'],
    ['sailing', 'wine tasting', 'scuba diving'],
];

for (let i = 1; i <= 100; i++) {
    const displayName = `User ${i}`;
    const email = `user${i}@example.com`;
    // Cycle through the interests list
    const userInterests = interestsList[i % interestsList.length];
    
    dummyUsers.push({
        email: email,
        password: 'password123',
        displayName: displayName,
        interests: userInterests
    });
}


const ADMIN_APP_NAME = 'firebase-admin-seeder';

function getAdminApp() {
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }
  
  // When running this script locally, it will automatically use the service account
  // specified in the GOOGLE_APPLICATION_CREDENTIALS environment variable.
  console.log(`[Seed Script] Initializing new Admin SDK app instance: ${ADMIN_APP_NAME}`);
  try {
    // No arguments needed if GOOGLE_APPLICATION_CREDENTIALS is set
    const newApp = initializeApp(undefined, ADMIN_APP_NAME);
    console.log("[Seed Script] Admin SDK app instance initialized successfully.");
    return newApp;
  } catch (error: any) {
    console.error("[Seed Script] CRITICAL: Failed to initialize Admin SDK app.", error);
    console.error("Please ensure you have set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your service account key file.");
    process.exit(1);
  }
}

const getDefaultVercelAvatar = (identifier: string | null | undefined): string => {
    const textIdentifier = identifier || 'User';
    const firstChar = (textIdentifier.charAt(0) || 'U').toUpperCase();
    return `https://avatar.vercel.sh/${encodeURIComponent(textIdentifier)}.png?text=${firstChar}`;
};

async function seedUsers() {
  console.log('--- Starting User Seeding Script ---');

  const app = getAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  for (const userData of dummyUsers) {
    const { email, password, displayName, interests } = userData;

    try {
      // Check if user already exists in Auth
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`User with email ${email} already exists in Firebase Auth. Skipping creation.`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // User does not exist, create them
          console.log(`Creating user in Firebase Auth: ${email}`);
          userRecord = await auth.createUser({
            email,
            password,
            displayName,
            emailVerified: true,
          });
          console.log(`Successfully created user in Auth: ${userRecord.uid}`);
        } else {
          // Re-throw other auth errors
          throw error;
        }
      }
      
      const userDocRef = db.collection('users').doc(userRecord.uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        console.log(`User document for ${email} (ID: ${userRecord.uid}) already exists in Firestore. Skipping.`);
      } else {
        // Create user document in Firestore
        console.log(`Creating user document in Firestore for ${email} (ID: ${userRecord.uid})`);
        await userDocRef.set({
          id: userRecord.uid,
          name: displayName,
          email: email,
          avatar: getDefaultVercelAvatar(displayName || email),
          bio: `Hello, I'm ${displayName}. My interests are ${interests.join(', ')}.`,
          interests: interests,
          friendIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`Successfully created Firestore document for ${userRecord.uid}`);
      }
    } catch (error) {
      console.error(`Failed to process user ${email}:`, error);
    }
  }

  console.log('--- User Seeding Script Finished ---');
}

// Execute the script
seedUsers().catch(console.error);
