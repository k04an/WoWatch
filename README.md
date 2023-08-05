# WoWatch
An application for tracking players online on World of Warcraft private servers.
## Speak russian?
Файл README доступен на [русском](https://github.com/k04an/WoWatch/blob/master/README_RU.md).
## General info
### Why?
So, some of the WoW servers display number of players online thier websites. But the problem is that you can only see current players number. But you can't actually track how the amount of players changed over time.
### How does this work?
So basically this application is parsing information about players online from WoW server's website and saves it to database with timestamp. Then you can see this information in charts.
### Wanna try?
Application is available via [this link](http://wowatch.k04an.site/).
## Technical info
### What's under the hood?
The application is written is JavaScript and using [NodeJs](https://nodejs.org) for its interpretation and following node modules to make things working:

- [Express](https://expressjs.com) - it's a framework which is used for web routing and plays a role of web server in general.
- [Sequelize](https://sequelize.org/) - An [ORM](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) module for NodeJS. Used to interact with database without SQL queries, but with JavaScript objects and methods.
- [EJS](https://ejs.co/) - template engine that lets you generate HTML markup with plain JavaScript.

And some other modules that make things easier to do. Like [dateformat](https://www.npmjs.com/package/dateformat) and [dotenv](https://www.npmjs.com/package/dotenv). Full list of packages used can be found in `package.json`.

[Bootstrap](https://getbootstrap.com/) - frontend toolkit which was to for markup and styling.

## Installation
### Get started
Copy this repo on your server:
```bash
git clone https://github.com/k04an/WoWatch
```

Install dependencies
```bash
npm install
```

And create `.env` file project directory to configure an app. This `.env` options is given below.

Run `db-sync.js` script to create database structure.
```bash
npm db-sync
```

And the last thing, run scripts `web.js` to launch web server and `collector.js` for data parsing. That can be done by creating daemon or using process manager for Node like [PM2](https://pm2.keymetrics.io/).
```bash
npm i -g pm2
pm2 start web.js
pm2 start collector.js
```

### .env configuration
Application can be configured with `.env` file. The list of options is given below.
```Shell
DB_NAME="" # Name of the database
DB_USER="" # User which will be used
DB_PASSWORD="" # user's passwork
DB_HOST="" # Host for database

WEB_PORT=80 # Port for webserver to use (optional)

# Frequency of parsing. Using CRON mask (optional, default: once an hour)
COLLECTOR_CRONMASK="*/30 * * * *"

COLLECTOR_API_PORT=3761 # Port for internal api. Used to get collection status
```