import { seedUlbBoundaries } from './ulbBoundaries.js';
import { seedUsers } from './seedUsers.js';
import { sequelize, User, Issue, Department, Ward } from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const seedDatabase = async () => {
    try {
        console.log('🚀 Starting Full Database Seeding...');

        // 1. Ensure Database is connected and extensions exist
        await sequelize.authenticate();
        console.log('✔ Database connection established.');
        
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'admin';`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'hq_staff';`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'viewer';`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'field_officer';`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'dept_head';`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'mayor';`);
        } catch (e) {}
        try {
            await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'councilor';`);
        } catch (e) {}
        
        // Drop incompatible foreign key constraint if it exists to allow 'SYSTEM' as actor_id string
        try {
            await sequelize.query('ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_fkey";');
        } catch (e) {}

        // 2. Sync Schema (Ensures tables exist and are up to date before truncation)
        try {
            await sequelize.sync({ alter: true });
            console.log('✔ Database schema synchronized (with alter).');
        } catch (error: any) {
            console.warn('⚠️ Sequelize sync alter failed, falling back to basic sync:', error.message);
            await sequelize.sync();
            console.log('✔ Database schema basic sync completed successfully.');
        }

        // 3. Clear critical tables if they exist to prevent duplication
        await sequelize.query('TRUNCATE TABLE "users", "wards", "departments", "ulb_boundaries" CASCADE');
        console.log('✔ Existing data cleared (Users, Wards, Departments, ULBs).');

        // 3. Seed ULB Boundaries & Default Wards
        await seedUlbBoundaries();
        console.log('✔ ULB Boundaries and default Wards seeded.');

        // 4. Seed Professional User Personas (also seeds specific depts/wards needed for personas)
        await seedUsers();
        console.log('✔ Professional user personas and departmental hierarchy seeded.');

        console.log('🎉 Full Database Seeding Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database Seeding Failed:', error);
        process.exit(1);
    }
};

seedDatabase();
