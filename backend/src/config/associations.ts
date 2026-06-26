import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Ward } from '../models/Ward.js';
import { Issue } from '../models/Issue.js';
import { Repair } from '../models/Repair.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { AIFeedback } from '../models/AIFeedback.js';
import { UserDevice } from '../models/UserDevice.js';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { RolePermission } from '../models/RolePermission.js';
import { UserRole } from '../models/UserRole.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { UlbBoundary } from '../models/UlbBoundary.js';
import { Zone } from '../models/Zone.js';


// ── Processing Jobs ──────────────────────────────────────────────
ProcessingJob.belongsTo(Issue, { foreignKey: 'issue_id', as: 'issue' });
Issue.hasMany(ProcessingJob, { foreignKey: 'issue_id', as: 'processing_jobs' });

// ── RBAC: Users ↔ Roles ↔ Permissions ───────────────────────────
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });

// ── Users ↔ Departments ──────────────────────────────────────────
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(User, { foreignKey: 'department_id', as: 'staff' });

// ── Users ↔ Wards ────────────────────────────────────────────────
User.belongsTo(Ward, { foreignKey: 'ward_id', as: 'ward' });
Ward.hasMany(User, { foreignKey: 'ward_id', as: 'citizens' });

// ── Wards ↔ Departments ──────────────────────────────────────────
Ward.belongsTo(Department, { foreignKey: 'dept_id', as: 'department' });
Department.hasMany(Ward, { foreignKey: 'dept_id', as: 'wards' });

// ── Issues ───────────────────────────────────────────────────────
Issue.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });
Issue.belongsTo(User, { foreignKey: 'assigned_staff_id', as: 'assigned_staff' });
Issue.belongsTo(Ward, { foreignKey: 'ward_id', as: 'ward' });

// ── Repairs ──────────────────────────────────────────────────────
Repair.belongsTo(Issue, { foreignKey: 'issue_id', as: 'issue' });
Repair.belongsTo(User, { foreignKey: 'worker_id', as: 'worker' });

// ── User Devices ─────────────────────────────────────────────────
User.hasMany(UserDevice, { foreignKey: 'user_id', as: 'devices' });
UserDevice.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ── ULB Boundaries ───────────────────────────────────────────────
User.belongsTo(UlbBoundary, { foreignKey: 'ulb_id', as: 'ulb' });
UlbBoundary.hasMany(User, { foreignKey: 'ulb_id', as: 'users' });
Ward.belongsTo(UlbBoundary, { foreignKey: 'ulb_id', as: 'ulb' });
UlbBoundary.hasMany(Ward, { foreignKey: 'ulb_id', as: 'wards' });
Department.belongsTo(UlbBoundary, { foreignKey: 'ulb_id', as: 'ulb' });
UlbBoundary.hasMany(Department, { foreignKey: 'ulb_id', as: 'departments' });

// ── Zones ────────────────────────────────────────────────────────
// constraints: false prevents Sequelize from emitting FK DDL during
// sync({ alter: true }) before the zones table exists (ordering issue).
// ORM-level associations (include/populate) still work correctly.
Zone.belongsTo(UlbBoundary, { foreignKey: 'ulb_id', as: 'ulb' });
UlbBoundary.hasMany(Zone, { foreignKey: 'ulb_id', as: 'zones' });
Ward.belongsTo(Zone, { foreignKey: 'zone_id', as: 'zone', constraints: false });
Zone.hasMany(Ward, { foreignKey: 'zone_id', as: 'wards', constraints: false });
Department.belongsTo(Zone, { foreignKey: 'zone_id', as: 'zone', constraints: false });
Zone.hasMany(Department, { foreignKey: 'zone_id', as: 'departments', constraints: false });
Department.belongsTo(Ward, { foreignKey: 'ward_id', as: 'ward', constraints: false });
Ward.hasMany(Department, { foreignKey: 'ward_id', as: 'departments', constraints: false });

