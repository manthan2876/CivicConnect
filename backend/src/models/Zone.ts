import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Zone extends Model {
    declare id: string;
    declare name: string;
    declare code: string;
    declare boundary: any;
    declare ulb_id: number;
}

Zone.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    boundary: {
        type: DataTypes.GEOMETRY('POLYGON', 4326),
        allowNull: true,
    },
    ulb_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ulb_boundaries',
            key: 'id',
        },
    },
}, {
    sequelize,
    tableName: 'zones',
    timestamps: true,
});
