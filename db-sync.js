const models  = require('./models')
const chalk = require('chalk')

let main = async () => {
    // Проверяем соединие с БД
    try {
        await models.sequelize.authenticate()
        console.log(chalk.green('Connection to DB established'))
    } catch (err) {
        console.log(chalk.red('Error occured when connection to DB: ', err.parent.sqlMessage))
        return
    }

    // Синхронизируем модели
    try {
        await models.sequelize.sync({force: true})
        console.log(chalk.green('Models synced successfuly'))
    } catch (err) {
        console.log(chalk.red('Error occured when syncing DB: ', err.parent.sqlMessage))
        return
    } finally {
        console.log(chalk.green('Closing connection...'))
        await models.sequelize.close()
    }
}
main()