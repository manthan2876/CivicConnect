import { sequelize } from './database.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';

/** Default role → permission mapping for seeding */
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    viewer: ['report:view_my', 'report:view_area'],
    citizen: ['report:create', 'report:view_my', 'report:view_area', 'report:upvote', 'report:confirm_resolution', 'report:reject_resolution'],
    field_officer: ['report:create', 'report:view_my', 'report:view_area', 'report:view_all', 'report:upvote', 'report:update_status', 'report:propose_resolution'],
    hq_staff: ['report:create', 'report:view_my', 'report:view_area', 'report:view_all', 'report:upvote', 'report:assign', 'report:update_status', 'report:propose_resolution', 'report:bulk_update', 'ai:manage'],
    dept_head: ['report:create', 'report:view_my', 'report:view_area', 'report:view_all', 'report:upvote', 'report:assign', 'report:update_status', 'report:propose_resolution', 'report:confirm_resolution', 'report:reject_resolution', 'report:bulk_update', 'analytics:query'],
    admin: ['report:create', 'report:view_my', 'report:view_area', 'report:view_all', 'report:upvote', 'report:assign', 'report:update_status', 'report:propose_resolution', 'report:confirm_resolution', 'report:reject_resolution', 'report:bulk_update', 'report:delete', 'analytics:query', 'ai:manage', 'users:manage', 'audit:view'],
    super_admin: ['report:create', 'report:view_my', 'report:view_area', 'report:view_all', 'report:upvote', 'report:assign', 'report:update_status', 'report:propose_resolution', 'report:confirm_resolution', 'report:reject_resolution', 'report:bulk_update', 'report:delete', 'analytics:query', 'ai:manage', 'users:manage', 'audit:view'],
    mayor: ['report:view_all', 'analytics:query', 'audit:view'],
    councilor: ['report:view_area', 'analytics:query'],
};

/** Seeds roles and their permissions into the database. */
async function seedRolesAndPermissions(): Promise<void> {
    const allPermissionKeys = Array.from(new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat()));
    const permissionInstances: Record<string, any> = {};

    for (const key of allPermissionKeys) {
        const [permission] = await Permission.findOrCreate({ where: { key } });
        permissionInstances[key] = permission;
    }

    for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        const [role] = await Role.findOrCreate({ where: { name: roleName } });
        const pIds = permissionKeys.map(k => permissionInstances[k].id);
        await (role as any).setPermissions(pIds);
    }

    console.log('Roles and permissions seeded successfully');
}

/** Adds any new ENUM values for user roles that might be missing. */
async function migrateEnumRoles(): Promise<void> {
    const newRoles = ['admin', 'hq_staff', 'viewer', 'field_officer', 'dept_head', 'mayor', 'councilor'];
    for (const r of newRoles) {
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS '${r}';`);
        } catch (_) { /* Ignore if already exists */ }
    }
}

/** Runs targeted DB migrations for vector, audio, processing_jobs, and stored procs. */
async function runMigrations(): Promise<void> {
    try {
        await sequelize.query(`
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
            ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
            ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "audio_text" TEXT;
            ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "assigned_department_id" UUID REFERENCES "departments" ("id") ON DELETE SET NULL;
            ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "assigned_staff_id" UUID REFERENCES "users" ("id") ON DELETE SET NULL;

            CREATE TABLE IF NOT EXISTS "processing_jobs" (
              "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "issue_id"        UUID REFERENCES issues(id) ON DELETE CASCADE,
              "image_s3_key"    TEXT,
              "image_get_url"   TEXT,
              "audio_s3_key"    TEXT,
              "audio_get_url"   TEXT,
              "description"     TEXT,
              "latitude"        NUMERIC(9,6) NOT NULL,
              "longitude"       NUMERIC(9,6) NOT NULL,
              "reporter_id"     UUID NOT NULL,
              "ward_id"         UUID NOT NULL,
              "status"          TEXT DEFAULT 'pending',
              "attempts"        INT DEFAULT 0,
              "result"          JSONB,
              "error"           TEXT,
              "createdAt"       TIMESTAMPTZ DEFAULT NOW(),
              "updatedAt"       TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Targeted migrations executed successfully');
    } catch (err: any) {
        console.warn('Migration warning (non-fatal):', err.message);
    }
}

/** Establishes PostgreSQL connection, runs migrations, and seeds roles. */
export const connectPostgres = async (): Promise<void> => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected successfully (Sequelize)');

        await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('PostGIS & Vector extensions verified');

        // Drop incompatible FK constraint to allow 'SYSTEM' as actor_id string
        try {
            await sequelize.query('ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_fkey";');
        } catch (_) {}

        const isProduction = process.env.NODE_ENV === 'production';
        const forceAlter = process.env.FORCE_DB_ALTER === 'true';
        try {
            await sequelize.sync({ alter: !isProduction || forceAlter });
            console.log(`Database tables synced (alter: ${!isProduction || forceAlter})`);
        } catch (syncErr: any) {
            console.warn('Sequelize sync alter failed, falling back to basic sync:', syncErr.message);
            await sequelize.sync();
            console.log('Database basic sync completed successfully');
        }

        await migrateEnumRoles();
        await runMigrations();

        try {
            await seedRolesAndPermissions();
        } catch (seedErr: any) {
            console.error('Error seeding roles and permissions:', seedErr.message);
        }
    } catch (error) {
        console.error('PostgreSQL connection error:', error);
        process.exit(1);
    }
};
