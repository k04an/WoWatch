const fetch = require('node-fetch')
const { parse } = require('node-html-parser')
const models = require('./models')
const schedule = require('node-schedule')
require('dotenv').config()

// Получаем конфигурацию интервалов парсера из .env (по-умолчанию: каждый час)
const cronMask = process.env.COLLECTOR_CRONMASK==undefined ? "0 */1 * * *" : process.env.COLLECTOR_CRONMASK

let collector = async () => {
    return new Promise((resolve, reject) => {
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