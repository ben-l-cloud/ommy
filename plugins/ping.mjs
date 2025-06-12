import os from 'os'
import { performance } from 'perf_hooks'
import moment from 'moment-timezone'
import { createCanvas, loadImage, registerFont } from 'canvas'
import path from 'path'
import fs from 'fs'

Zokou(
  {
    nomCom: "ping",
    categorie: "tools",
    reaction: "📸",
    desc: "Speed + System info image",
    fromMe: false
  },
  async (sock, msg) => {
    const start = performance.now()
    const speed = (performance.now() - start).toFixed(2)
    const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(1)
    const host = os.hostname()
    const now = moment().tz('Africa/Nairobi').format('DD/MM/YYYY, HH:mm:ss')

    const canvas = createCanvas(800, 400)
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = "#0f0f0f"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Font style
    registerFont(path.join('./fonts', 'OpenSans-Bold.ttf'), { family: 'OpenSans' })
    ctx.font = '32px OpenSans'
    ctx.fillStyle = "#00ff99"

    // Title
    ctx.fillText(`OMMY-BOT SPEED: ${speed}ms 🎉`, 50, 70)

    // Other info
    ctx.fillStyle = "#ffffff"
    ctx.font = '26px OpenSans'
    ctx.fillText(`📅 Tarehe: ${now}`, 50, 140)
    ctx.fillText(`🧠 Host: ${host}`, 50, 190)
    ctx.fillText(`💾 RAM: ${usedMem}MB / ${totalMem}MB`, 50, 240)
    ctx.fillText(`🔁 Forwarded: MANY TIMES`, 50, 290)

    // Save to buffer
    const buffer = canvas.toBuffer()

    // Send image
    await sock.sendMessage(msg.key.remoteJid, {
      image: buffer,
      mimetype: 'image/png',
      caption: '🔧 *System Info Generated*',
      contextInfo: {
        isForwarded: true,
        forwardingScore: 9999
      }
    }, { quoted: msg })
  }
)
