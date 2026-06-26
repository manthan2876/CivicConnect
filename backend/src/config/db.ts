import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from './database.js';

// Import all models
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

// Initialize associations
import './associations.js';

export {
    sequelize,
    User,
    Department,
    Ward,
    Issue,
    Repair,
    AuditLog,
    Notification,
    AIFeedback,
    UserDevice,
    Role,
    Permission,
    RolePermission,
    UserRole,
    ProcessingJob,
    UlbBoundary,
    Zone
};
