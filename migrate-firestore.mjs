import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);

const sourceKey = JSON.parse(readFileSync('./e-bank-dashboard-firebase-adminsdk-fbsvc-cef8ea4442.json', 'utf8'));
const destKey = JSON.parse(readFileSync('./frbr-ebank-dashboard-firebase-adminsdk-fbsvc-e32c1f27b9.json', 'utf8'));

const sourceApp = initializeApp({ credential: cert(sourceKey) }, 'source');
const destApp = initializeApp({ credential: cert(destKey) }, 'dest');

const sourceDb = getFirestore(sourceApp);
const destDb = getFirestore(destApp);

async function migrateCollection(collectionRef, destCollectionRef, depth = 0) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;

  const indent = '  '.repeat(depth);
  console.log(`${indent}📁 ${collectionRef.path} — ${snapshot.size} docs`);

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Write document to destination
    await destCollectionRef.doc(doc.id).set(data);
    process.stdout.write(`${indent}  ✓ ${doc.id}\n`);

    // Recurse into subcollections
    const subcollections = await doc.ref.listCollections();
    for (const subcol of subcollections) {
      const destSubcol = destCollectionRef.doc(doc.id).collection(subcol.id);
      await migrateCollection(subcol, destSubcol, depth + 1);
    }
  }
}

async function migrate() {
  console.log('🚀 Starting Firestore migration...');
  console.log(`   Source:      ${sourceKey.project_id}`);
  console.log(`   Destination: ${destKey.project_id}`);
  console.log('');

  const collections = await sourceDb.listCollections();

  if (collections.length === 0) {
    console.log('⚠️  No collections found in source project.');
    return;
  }

  for (const col of collections) {
    const destCol = destDb.collection(col.id);
    await migrateCollection(col, destCol);
  }

  console.log('\n✅ Migration complete!');
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
