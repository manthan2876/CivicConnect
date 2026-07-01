import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class User extends Model {
    declare id: string;
    declare phone: string | null;
    declare email: string | null;
    declare green_credits: number;
    declare ward_id: string | null;
    declare role: string;
    declare department_id: string | null;
    declare ulb_id: number | null;
    declare temp_password_cleartext: string | null;
    declare is_active: boolean;
    declare home_location: any;
    declare alert_radius_meters: number;
    declare achievements: any;
    declare avatar_url: string | null;
    // Association populated by Sequelize `include` (RBAC roles with permissions)
    declare roles?: any[];
}





User.init({
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },


    green_credits: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    ward_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'wards',
            key: 'id',
        },
    },
    role: {
        type: DataTypes.ENUM('citizen', 'staff', 'authority', 'admin', 'super_admin', 'hq_staff', 'viewer', 'field_officer', 'dept_head', 'mayor', 'councilor'),
        defaultValue: 'citizen',
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    department_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'departments',
            key: 'id',
        },
    },
    ulb_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'ulb_boundaries',
            key: 'id',
        },
    },
    temp_password_cleartext: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    home_location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
    },
    alert_radius_meters: {
        type: DataTypes.INTEGER,
        defaultValue: 2000,
    },
    achievements: {
        type: DataTypes.JSONB,
        defaultValue: [], // Array of { badgeId, awardedAt }
    },
    avatar_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {



    sequelize,
    tableName: 'users',
    timestamps: true,
});

