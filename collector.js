const fetch = require('node-fetch')
const { parse } = require('node-html-parser')
const models = require('./models')
const schedule = require('node-schedule')
require('dotenv').config()
const app = require('express')()
const logger = require('./logger')

const moduleName = 'Collector'

// Получаем конфигурацию интервалов парсера из .env (по-умолчанию: каждый час)
const cronMask = process.env.COLLECTOR_CRONMASK==undefined ? "0 */1 * * *" : process.env.COLLECTOR_CRONMASK


// Массив серверов с обработчиками, парсящим кол-во игроков
// TODO: Добавить обработчик исключений, если сервер не доступен и тому подобное
let serverList = [
    {
        name: 'Warmane - Lordaeron',
        address: 'https://www.warmane.com/',
        getPlayers: async () => {
            let resp = await fetch('https://www.warmane.com/')
            let root = parse(await resp.text())
            return root.querySelector('.statistics').innerText.trim().split(' ')[0]
        }
    },
    {
        name: 'Stormforge - Mistblade',
        address: 'https://stormforge.gg/',
        getPlayers: async () => {
            let resp = await fetch('https://stormforge.gg/')
            let root = parse(await resp.text())
            return root.querySelector('.home-welcome-realms>div>div:nth-child(2)>span').innerText
        }
    }
]

let collector = async () => {
    return new Promise((resolve, reject) => {
        // Добавляем данные об игроках в БД
        serverList.forEach(async (server, index) => {
            // Пытаемся спарсить кол-во игроков
            let playerNumber
            try {
                playerNumber = await server.getPlayers()
            } catch (error) {
                logger(`Failed to fetch player number from ${server.name}`, 'error', moduleName)
            }

            // Пытаемся добавить данные в базу
            try {
                let serverModel = await models.Server.findOrCreate({
                    where: {
                        name: server.name,
                        address: server.address
                    }
                })
                await models.Record.create({
                    playerNumber: playerNumber,
                    ServerId: serverModel[0].id
                })
    
                if (index == serverList.length-1) {
                    resolve()
                }
            } catch (error) {
                logger(`Failed to add data to database`, 'error', moduleName)
            }
        })
    })
}   

const scheduledJob = schedule.scheduleJob(cronMask, async () => {
    let currentDateObj = new Date()
    let timeLog = `[${currentDateObj.getDate()}.${currentDateObj.getMonth()+1}.${currentDateObj.getFullYear()} ${currentDateObj.getHours()}:${currentDateObj.getMinutes()}] `

    logger('Executing collection cycle...', 'success', moduleName)
    await collector()
    logger('Data collection completed!', 'success', moduleName)
})

// Веб API для для предоставления информации о работе коллектора другим модулям
app.get('/status/:url', (req, res) => {
    let result = serverList.find((e) => {
        return req.params.url == e.name
    })

    if (result != undefined) {
        res.json({ status: 'up', desc: 'Server is in the collection list' })
    } else {
        res.json({ status: 'down', desc: 'Server is not found in collection list' })
    }
    logger(`200 OK - from (${req.ip})`)
})

app.get('*', (req, res) => {
    res.status(400)
    res.send('Bad request')
})

app.listen(process.env.COLLECTOR_API_PORT == undefined ? 28456 : process.env.COLLECTOR_API_PORT, () => {
    logger(`Collector API is listening on port ${process.env.COLLECTOR_API_PORT == undefined ? 28456 : process.env.COLLECTOR_API_PORT}`, 'success', moduleName)
})