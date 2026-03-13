import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { Drug } from './entities/drug.entity';
import { DRUGS_SEED } from './seeds/drugs.seed';

config({ path: resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'pt_center',
        ssl: false,
      }),
  entities: [Drug],
  synchronize: false,
});

dataSource
  .initialize()
  .then(async () => {
    const repo = dataSource.getRepository(Drug);
    const existing = await repo.count();
    if (existing > 0) {
      console.log('Drugs already seeded, skip.');
      return dataSource.destroy();
    }
    for (const row of DRUGS_SEED) {
      await repo.save(repo.create(row));
    }
    console.log(`Seeded ${DRUGS_SEED.length} drugs.`);
    return dataSource.destroy();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
