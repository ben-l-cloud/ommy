import 'dotenv/config'
import express from 'express'
import { Boom } from '@hapi/boom'
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import P from 'pino'

// 🌐 Minimal Web Server for Render/Heroku
const app = express()
const PORT = process.env.PORT || 3000
app.get('/', (req, res) => res.send('🤖 Ommy Bot is Running!'))
app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`))

// 📚 Zokou Framework
global.Zokou = ({ nomCom, categorie = 'misc', reaction = "✅", desc = "", use = "", fromMe = false }, func) => {
  global.commands.push({
    nomCom,
    categorie,
    reaction,
    desc,
    use,
    fromMe,
    execute: func
  })
}

// 🔌 Load All Plugins
global.commands = []
const pluginsDir = path.join('./plugins')
fs.readdirSync(pluginsDir).forEach(file => {
  if (file.endsWith('.js')) {
    import(`./plugins/${file}`).catch(err => console.error("❌ Plugin Error:", err))
  }
})

// 🚀 Start Bot
const startOmmyBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['Ommy', 'Chrome', '1.0']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startOmmyBot()
    }
    console.log(chalk.greenBright("🔌 Connection status:"), connection)
  })

  // 💬 Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    const sender = msg.key.participant || msg.key.remoteJid
    const fromOwner = sender.includes(process.env.OWNER_NUMBER)

    if (!fromOwner) {
      await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ TAFUTA LAKO KENGE WEWE 🐸' }, { quoted: msg })
      return
    }

    const mtext = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

    for (const command of global.commands) {
      if (mtext.trim().toLowerCase() === command.nomCom.toLowerCase()) {
        if (command.fromMe && !msg.key.fromMe) return
        if (process.env.FAKE_RECORDING === 'on') {
          await sock.sendPresenceUpdate('recording', msg.key.remoteJid)
        }
        await command.execute(sock, msg, mtext)
        if (command.reaction) {
          await sock.sendMessage(msg.key.remoteJid, {
            react: { text: command.reaction, key: msg.key }
          })
        }
      }
    }
  })

  // 👀 View Status Automatically
  if (process.env.AUTO_VIEW_STATUS === 'on') {
    sock.ev.on('messages.update', async updates => {
      for (const update of updates) {
        if (update.messageStubType === 28) {
          await sock.readMessages([update.key])
        }
      }
    })
  }
}

startOmmyBot()
