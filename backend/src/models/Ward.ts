import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Ward extends Model {
    declare id: string;
    declare boundary: any;
    declare dept_id: string;
    declare ulb_id: number | null;
    declare zone_id: string | null;
    declare name: string;
}

Ward.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    boundary: {
        type: DataTypes.GEOMETRY('POLYGON', 4326),
        allowNull: false,
    },
    dept_id: {
        type: DataTypes.UUID,
        allowNull: false,
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
    zone_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'zones',
            key: 'id',
        },
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    tableName: 'wards',
});
