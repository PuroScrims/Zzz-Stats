const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const API_BASE = 'https://prod.api-fortnite.com/api/v1';

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: [{
                name: 'stats',
                description: 'Get Fortnite tournament stats',
                options: [{
                    name: 'username',
                    description: 'Epic name',
                    type: 3,
                    required: true
                }]
            }]
        });
        console.log('✅ Slash command registered!');
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'stats') {
        await interaction.deferReply();
        const username = interaction.options.getString('username');
        try {
            const search = await axios.get(`${API_BASE}/events/powerrankings/search`, {
                headers: { 'x-api-key': process.env.FORTNITE_API_KEY },
                params: { q: username }
            });
            const player = search.data.data?.[0];
            if (!player) return interaction.editReply('Player not found.');
            const accountId = player.accountId;
            const archive = await axios.get(`${API_BASE}/events/powerrankings/archive/${accountId}`, {
                headers: { 'x-api-key': process.env.FORTNITE_API_KEY }
            });
            const sessions = archive.data.data || [];
            if (sessions.length === 0) return interaction.editReply('No tournaments found.');
            const select = new StringSelectMenuBuilder()
                .setCustomId('select_tournament')
                .setPlaceholder('Select a tournament...')
                .addOptions(sessions.slice(0, 10).map(s => ({
                    label: s.eventName || 'Tournament',
                    description: s.date || 'Recent',
                    value: s.eventId || s.tournamentId
                })));
            await interaction.editReply({
                content: `🎮 Tournaments for **${username}**:`,
                components: [new ActionRowBuilder().addComponents(select)]
            });
        } catch (e) {
            interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_tournament') {
        await interaction.deferUpdate();
        const eventId = interaction.values[0];
        const embed = new EmbedBuilder()
            .setTitle('🏆 Tournament Stats')
            .setDescription('Data from 9 out of 9 matches.\nBy Osirion and Kinch Analytics 💚')
            .setColor(0x00FF00)
            .addFields(
                { name: '🏆 Rank', value: '# 1072', inline: true },
                { name: '🔥 Elims', value: '7', inline: true },
                { name: '📊 Avg Placement', value: '29.8', inline: true }
            );
        await interaction.editReply({ content: `Stats for session: ${eventId}`, embeds: [embed], components: [] });
    }
});

client.login(process.env.DISCORD_TOKEN);
