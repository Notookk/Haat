import mongoose from '../node_modules/.pnpm/mongoose@8.9.5/node_modules/mongoose/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file
const envPath = path.resolve(__dirname, '..', '.env');
const envFile = fs.readFileSync(envPath, 'utf8');

let uri = '';
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('MONGODB_URI=')) {
    uri = trimmed.slice('MONGODB_URI='.length).replace(/^["']|["']$/g, '');
    break;
  }
}

if (!uri) {
  console.error('Error: No MONGODB_URI found in .env');
  process.exit(1);
}

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected successfully to database:', mongoose.connection.name);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log('Database has no collections. It is already completely empty.');
  } else {
    console.log(`Found ${collections.length} collection(s) to remove:`);
    for (const col of collections) {
      if (!col.name.startsWith('system.')) {
        await db.collection(col.name).drop();
        console.log(`  ✓ Dropped collection: ${col.name}`);
      }
    }
  }

  const remaining = await db.listCollections().toArray();
  console.log('Verification: remaining collections count =', remaining.length);
  if (remaining.length > 0) {
    console.log('Remaining:', remaining.map((c) => c.name));
  } else {
    console.log('SUCCESS: All collections dropped. Database is completely blank.');
  }

  await mongoose.disconnect();
  console.log('Database connection closed.');
}

run().catch((err) => {
  console.error('Failed to drop collections:', err);
  process.exit(1);
});
