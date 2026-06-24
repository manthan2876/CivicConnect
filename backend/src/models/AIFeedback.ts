import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class AIFeedback extends Model {
    declare id: string;
    declare issue_id: string;
    declare original_category: string;
    declare corrected_category: string;
    declare media_url: string | null;
    declare status: string;
    declare createdAt: Date;
    declare updatedAt: Date;
}

AIFeedback.init({
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
        onDelete: 'CASCADE',
    },
    original_category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    corrected_category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    media_url: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Pending Retraining', 
    }
}, {
    sequelize,
    tableName: 'ai_feedback_queue',
    timestamps: true,
});
