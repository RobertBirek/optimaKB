---
description: Backup the OpenSPG Docker stack (mysql, neo4j, minio data) and verify the snapshot integrity.
---

Run `node scripts/backup_openspg_stack.mjs` to create a backup, then `node scripts/verify_openspg_backup_snapshot.mjs` to verify the snapshot.

Backups go to `backups/` directory. Report the backup path, size, and verification status.
