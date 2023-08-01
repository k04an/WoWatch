const express = require('express')
const app = express()
const models = require('./models')

app.use(express.static('public'))
app.set('view engine', 'ejs')

app.get('/', async (req, res) => {
    res.render('index', {
        servers: await models.Server.findAll()
    })
})

app.get('/stat/:serverId', async (req, res) => {
    // Получаем объект указанного сервера и сопустсвующих записей из БД
    let server = await models.Server.findByPk(req.params.serverId)
    let records = await models.Record.findAll({ where: { ServerId: server.dataValues.id } })
    let labelsArr = [], valuesArr = [] // Массивы для данных и подписей диаграммы
    
    // Получаем из БД минимальную и максимальную даты, для ограничения выбора на странице
    let minDate = await models.Record.findOne({
        where: { ServerId: server.dataValues.id },
        attributes: [
                [models.sequelize.fn('min', models.sequelize.col('createdAt')), 'minDate']
        ]
    })

    let maxDate = await models.Record.findOne({
        where: { ServerId: server.dataValues.id },
        attributes: [
                [models.sequelize.fn('max', models.sequelize.col('createdAt')), 'maxDate']
        ]
    })

    // Заполняем массивы для диаграммы
    records.forEach((record) => {
        valuesArr.push(record.dataValues.playerNumber)
        let date = new Date(record.dataValues.createdAt)
        labelsArr.push(`${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`)
    })

    // Рендерим станицу с заданым контекстом
    res.render('stat', {
        serverName: server.dataValues.name,
        records: {
            labels: JSON.stringify(labelsArr),
            values: JSON.stringify(valuesArr),
            minDate: minDate.dataValues.minDate,
            maxDate: maxDate.dataValues.maxDate
        }
    })
})

app.listen(410, () => {
    console.log('Web server is up')
})