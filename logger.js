const chalk = require('chalk')
const dateFormat = require('dateformat')

const getTime = () => {
    let date = new Date(Date.now())
    return `[${dateFormat(date, "dd.mm.yyyy HH:MM")}]`
}

module.exports = (msg, type = 'success', moduleName = undefined, ) => {
    let colorFunction
    switch (type) {
        case 'success':
            colorFunction = chalk.green
            break
        case 'error':
            colorFunction = chalk.red
            break
        case 'warning':
            colorFunction = chalk.yellow
            break
    }

    moduleName = moduleName == undefined ? null : `[${moduleName}]`
    console.log(colorFunction(getTime(), moduleName, msg))
}