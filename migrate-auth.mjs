import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const sourceKey = JSON.parse(readFileSync('./e-bank-dashboard-firebase-adminsdk-fbsvc-cef8ea4442.json', 'utf8'));
const destKey = JSON.parse(readFileSync('./frbr-ebank-dashboard-firebase-adminsdk-fbsvc-cda6c9d4f9.json', 'utf8'));

const sourceApp = initializeApp({ credential: cert(sourceKey) }, 'source');
const destApp = initializeApp({ credential: cert(destKey) }, 'dest');

const sourceAuth = getAuth(sourceApp);
const destAuth = getAuth(destApp);

async function migrateUsers() {
  console.log('🚀 Starting Firebase Auth migration...');
  console.log(`   Source:      ${sourceKey.project_id}`);
  console.log(`   Destination: ${destKey.project_id}\n`);

  let allUsers = [];
  let nextPageToken;
  do {
    const result = await sourceAuth.listUsers(1000, nextPageToken);
    allUsers = allUsers.concat(result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`📋 Found ${allUsers.length} users\n`);

  let successCount = 0;
  let errorCount = 0;

  // Import one by one to isolate failures
  for (const user of allUsers) {
    const importUser = {
      uid: user.uid,
      emailVerified: user.emailVerified ?? false,
      disabled: user.disabled ?? false,
    };
    if (user.email) importUser.email = user.email;
    if (user.displayName) importUser.displayName = user.displayName;
    if (user.photoURL) importUser.photoURL = user.photoURL;
    if (user.phoneNumber) importUser.phoneNumber = user.phoneNumber;
    if (user.customClaims) importUser.customClaims = user.customClaims;

    try {
      const result = await destAuth.importUsers([importUser]);
      if (result.errors.length > 0) {
        console.error(`  ❌ ${importUser.email || importUser.uid}: ${result.errors[0].error.message}`);
        errorCount++;
      } else {
        console.log(`  ✓ ${importUser.email || importUser.uid}`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ ${importUser.email || importUser.uid}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Done! Imported: ${successCount} | Failed: ${errorCount}`);
  if (errorCount > 0) {
    console.log('\n⚠️  Imported users have no password — they must use "Forgot Password" to set a new one.');
  }
}

migrateUsers().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
