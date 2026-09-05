import { db } from './src/db';
import { companies } from './src/db/schema';

async function main() {
  try {
    const comp = await db.query.companies.findFirst();
    console.log('Successfully connected to DB! Found company:', comp?.name);
  } catch (error) {
    console.error('Error connecting to DB:', error);
  }
}
main();
