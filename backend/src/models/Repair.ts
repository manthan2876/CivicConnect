import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Repair extends Model {
    declare id: string;
    declare issue_id: string;
    declare worker_id: string;
    declare s3_post_key: string;
    declare siamese_verified: boolean;
    declare closed_at: Date;
}

Repair.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    issue_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'issues',
            key: 'id',
        },
    },
    worker_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    s3_post_key: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    siamese_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    tableName: 'repairs',
    timestamps: true,
});

