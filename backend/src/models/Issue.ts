import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Issue extends Model {
    declare id: string;
    declare reporter_id: string;
    declare ward_id: string;
    declare location: any;
    declare category: string;
    declare description: string;
    declare priority_score: number;
    declare status: string;
    declare s3_pre_key: string;
    declare s3_audio_key: string | null;
    declare reporter_ids: string[];
    declare s3_image_urls: string[];
    declare s3_audio_urls: string[];
    declare ai_image_top3: any;

    declare ai_audio_top3: any;
    declare ai_text_top3: any;
    declare fusion_final_category: string | null;
    declare fusion_confidence_score: number | null;
    declare needs_human_review: boolean;
    declare assigned_department_id: string | null;
    declare assigned_staff_id: string | null;
    declare audio_text: string | null;
    declare createdAt: Date;
    declare updatedAt: Date;
}




Issue.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    reporter_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    ward_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'wards',
            key: 'id',
        },
    },
    location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    priority_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Pending',
    },
    s3_pre_key: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    s3_audio_key: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    reporter_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        defaultValue: [],
    },
    s3_image_urls: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
    },
    s3_audio_urls: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
    },
    description: {

        type: DataTypes.TEXT,
        allowNull: true,
    },
    ai_image_top3: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    ai_audio_top3: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    ai_text_top3: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    fusion_final_category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fusion_confidence_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    needs_human_review: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    assigned_department_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'departments',
            key: 'id',
        },
    },
    assigned_staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    audio_text: {
        type: DataTypes.TEXT,
        allowNull: true,
    },



}, {
    sequelize,
    tableName: 'issues',
    timestamps: true,
});

