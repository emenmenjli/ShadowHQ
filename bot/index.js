const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = '1350769624014258177';
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

let connection = null;
let cachedStats = { members: 0, online: 0, boosts: 0, roles: [] };
let lastFetch = 0;

function updateStats() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const members = guild.members.cache;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const boosts = guild.premiumSubscriptionCount || 0;
    const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor, members: r.members.size }))
        .sort((a, b) => b.members - a.members);

    cachedStats = { members: guild.memberCount, online, boosts, roles };
    lastFetch = Date.now();
}

async function connectToVC() {
    if (!VOICE_CHANNEL_ID) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = guild.channels.cache.get(VOICE_CHANNEL_ID);
    if (!channel || channel.type !== 2) return;

    try {
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true
        });
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch (err) {
        console.log('VC failed:', err.message);
    }
}

client.once('ready', () => {
    console.log(`Bot online: ${client.user.tag}`);
    updateStats();
    connectToVC();
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (!connection) return;
    if (oldState.member.id === client.user.id && !newState.channelId) {
        connectToVC();
    }
});

// HTTP server for stats
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/stats') {
        updateStats();
        res.end(JSON.stringify({
            members: cachedStats.members,
            online: cachedStats.online,
            boosts: cachedStats.boosts
        }));
    } else if (req.url === '/roles') {
        updateStats();
        res.end(JSON.stringify(cachedStats.roles));
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`Stats API on port ${PORT}`);
});

client.login(TOKEN);
