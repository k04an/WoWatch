const express = require('express')
const app = express()
const dateFormat = require('dateformat')
const { parse: dateParse } = require('date-format-parse')
const fetch = require('node-fetch')
const models = require('./models')
const logger = require('./logger')

const moduleName = 'Web server'

app.use(express.static('public'))
app.set('view engine', 'ejs')

app.get('/', async (req, res) => {
    try {
        res.render('index', {
            servers: await models.Server.findAll()
        })
        logger(`200 OK - Successfuly rendered home page (request from ${req.ip})`, 'success', moduleName)
    } catch (e) {
        logger('Database connection failed while rendering home page', 'error', moduleName)
        res.render('exception', {
            msg: 'Database connection failed',
            code: 500
        })
    }
})

app.get('/stat/:serverId', async (req, res) => {
    // Объявляем объект интервала фильтрации, и массивы данных и подписей к ним, для диагрммы
    let dateRange = {from: '', to: ''}, labelsArr = [], valuesArr = []

    // Получаем данные о сервере по указанному id из БД
    let server

    try {
        server = await models.Server.findByPk(req.params.serverId)
    } catch (error) {
        logger('Database connection failed while rendering stat page', 'error', moduleName)
        res.render('exception', {
            msg: 'Database connection failed',
            code: 500
        })
        return
    }

    // Если сервер с запрошенным id не найден
    if (server == null) {
        res.render('exception', {
            msg: 'Requested server not found',
            code: 404
        })
        return
    }

    // Получаем из БД минимальную и максимальную даты, для ограничения выбора на странице
    let minDateRecord = await models.Record.findOne({
        where: { ServerId: server.dataValues.id },
        attributes: [
                [models.sequelize.fn('min', models.sequelize.col('createdAt')), 'minDate']
        ]
    })

    let maxDateRecord = await models.Record.findOne({
        where: { ServerId: server.dataValues.id },
        attributes: [
                [models.sequelize.fn('max', models.sequelize.col('createdAt')), 'maxDate']
        ]
    })

    // Проверяем существуют ли вообще записи, для указанного сервера
    if (maxDateRecord.dataValues.maxDate != null) {
        // Получаем интервал дат из get запроса, при наличии.
        // Также задаем дефолтное значение при отсутствии заданного интервала или при некорректно указаном параметра
        dateRange = {
            from: new Date(new Date(maxDateRecord.dataValues.maxDate).setDate(maxDateRecord.dataValues.maxDate.getDate() - 1)),
            to: maxDateRecord.dataValues.maxDate
        }

        if (req.query.dateRange != undefined) {
            if (req.query.dateRange.split(' ').length == 5) {
                let queryArr = req.query.dateRange.split(' ')
                dateRange.from = dateParse(`${queryArr[0]} ${queryArr[1]}`, 'DD.MM.YYYY HH:mm')
                dateRange.to = dateParse(`${queryArr[3]} ${queryArr[4]}`, 'DD.MM.YYYY HH:mm')
            }
        }

        // Получаем данные об онлайне относящиеся к указанному серверу
        let records = await models.Record.findAll({where: {
            ServerId: server.dataValues.id,
            createdAt: { [models.Op.between]: [dateRange.from, dateRange.to] }
        }})
        
        // Заполняем массивы для диаграммы
        records.forEach((record) => {
            valuesArr.push(record.dataValues.playerNumber)
            let date = new Date(record.dataValues.createdAt)
            labelsArr.push(dateFormat(date, 'dd.mm.yyyy" at "HH:MM'))
        })
    }

    // Получаем статус сборщика
    let collectorStatus
    try {
        collectorStatus = await fetch(`http://localhost:${process.env.COLLECTOR_API_PORT == undefined ? 28456 : process.env.COLLECTOR_API_PORT}/status/${server.dataValues.name}`)
        collectorStatus = await collectorStatus.json()
    } catch (err) {
        collectorStatus = {
            status: 'error'
        }
    }

    logger(`200 OK - Successfuly rendered stat page (request from ${req.ip})`, 'success', moduleName)
    // Рендерим станицу с заданым контекстом
    res.render('stat', {
        server: {
            name: server.dataValues.name,
            date: dateFormat(Date.now(), 'dd.mm.yyyy'),
            time: dateFormat(Date.now(), 'HH:MM')
        },
        records: {
            labels: JSON.stringify(labelsArr),
            values: JSON.stringify(valuesArr),
            minDate: minDateRecord.dataValues.minDate,
            maxDate: maxDateRecord.dataValues.maxDate
        },
        currentPeriod: `${dateFormat(dateRange.from, 'dd.mm.yyyy HH:MM')} to ${dateFormat(dateRange.to, 'dd.mm.yyyy HH:MM')}`,
        collectorStatus: collectorStatus
    })
})

// Станица 404, при обращении к несуществующей станице
app.get('*', (req, res) => {
    logger(`Non-existent page was requested (${req.url}) by (${req.ip})`, 'warning', moduleName)
    res.render('exception', {
        msg: 'Requested page not found',
        code: 404
    })
})

app.listen(process.env.WEB_PORT == undefined ? 80 : process.env.WEB_PORT, () => {
    logger(`Web server is listening port ${process.env.WEB_PORT == undefined ? 80 : process.env.WEB_PORT}`, 'success', moduleName)
})