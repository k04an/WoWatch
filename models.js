const { Sequelize, DataTypes } = require('sequelize')
require('dotenv').config()

let main = async () => {
    // Создаем экземпляр sequelize с данными для подлючения к БД
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        dialect: 'mysql',
        host: process.env.DB_HOST,
        logging: false
    })
    
    // Объявляем модели
    let server = sequelize.define('Server', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false
        }
    })
    
    let record = sequelize.define('Record', {
        playerNumber: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    })

    // Задаем связи
    server.hasMany(record, {
        onDelete: 'cascade'
    })
    record.belongsTo(server)

    // Экспорт модуля
    module.exports = {
        Server: server,
        Record: record,
        sequelize: sequelize,
        Op: Sequelize.Op
    }
}
main()