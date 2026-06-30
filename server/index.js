const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const GUILD_ID = '1350769624014258177';
const TOKEN = process.env.DISCORD_TOKEN;

app.get('/stats', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    if (!TOKEN) {
        return res.status(500).json({ error: 'Bot token not configured' });
    }

    try {
        const resp = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`, {
            headers: { Authorization: `Bot ${TOKEN}` }
        });

        if (!resp.ok) {
            const errText = await resp.text();
            return res.status(resp.status).json({ error: `Discord API: ${errText}` });
        }

        const data = await resp.json();

        res.json({
            members: data.approximate_member_count || data.member_count,
            online: data.approximate_presence_count,
            boosts: data.premium_subscription_count || 0,
            name: data.name
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Stats server running on port ${PORT}`);
});
