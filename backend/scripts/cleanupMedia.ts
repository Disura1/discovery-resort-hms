import "dotenv/config";
import { mediaRepository } from "../src/modules/media/media.repository";
import { deleteObject } from "../src/utils/storage";
import { pool } from "../src/config/db";

async function main() {
  const stale = await mediaRepository.findStalePending(60); // never confirmed within 1 hour
  for (const item of stale) {
    try {
      await deleteObject(item.storage_key);
    } catch {
      // Object may never have actually been uploaded — fine either way.
    }
    await mediaRepository.delete(item.id);
  }
  console.log(`Cleaned up ${stale.length} abandoned upload(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});