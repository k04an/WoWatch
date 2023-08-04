const fetch = require('node-fetch')
const { parse } = require('node-html-parser')
const models = require('./models')
const schedule = require('node-schedule')
require('dotenv').config()
const app = require('express')()

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
            let serverModel = await models.Server.findOrCreate({
                where: {
                    name: server.name,
                    address: server.address
                }
            })
            await models.Record.create({
                playerNumber: await server.getPlayers(),
                ServerId: serverModel[0].id
            })

            if (index == serverList.length-1) {
                resolve()
            }
        })
    })
}   

const scheduledJob = schedule.scheduleJob(cronMask, async () => {
    let currentDateObj = new Date()
    let timeLog = `[${currentDateObj.getDate()}.${currentDateObj.getMonth()+1}.${currentDateObj.getFullYear()} ${currentDateObj.getHours()}:${currentDateObj.getMinutes()}] `

    console.log(`${timeLog}Executing collection cycle...`)
    await collector()
    console.log(`${timeLog}Data collection completed!`)
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
})

app.listen(process.env.COLLECTOR_API_PORT == undefined ? 28456 : process.env.COLLECTOR_API_PORT, () => {
    console.log('Collector is up 🤙')
})