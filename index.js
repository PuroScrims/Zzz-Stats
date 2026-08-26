const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

// --- Servidor web para mantener vivo en Render ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🤖 Bot Fortnite vivo!'));
app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));

// --- Configuración del bot ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const FORTNITE_API_KEY = process.env.FORTNITE_API_KEY || '5ce605be-e2f3-417c-8418-74b62c3d013a';
const API_BASE = 'https://fortnite-api.com/v2';

// --- Registrar comandos slash ---
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: [{
                name: 'stats',
                description: 'Get Fortnite stats for a player',
                options: [{
                    name: 'username',
                    description: 'Epic Games display name',
                    type: 3,
                    required: true
                }]
            }]
        });
        console.log('✅ Slash command registered!');
    } catch (e) { console.error(e); }
});

// --- Manejar comandos ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'stats') {
        await interaction.deferReply();
        const username = interaction.options.getString('username');

        try {
            // --- Buscar estadísticas del jugador ---
            const response = await axios.get(`${API_BASE}/stats/br/v2`, {
                params: {
                    name: username,
                    timeWindow: 'season'
                },
                headers: {
                    'Authorization': FORTNITE_API_KEY
                }
            });

            const data = response.data.data;
            if (!data || !data.battlePass || !data.stats) {
                return interaction.editReply(`❌ No se encontraron estadísticas para "${username}".`);
            }

            const stats = data.stats.all || data.stats;
            const account = data.account;

            // --- Crear embed con estadísticas ---
            const embed = new EmbedBuilder()
                .setTitle(`📊 Estadísticas de ${account.name || username}`)
                .setDescription(`Temporada ${data.battlePass.season || 'Actual'}`)
                .setColor(0x00FF00)
                .setThumbnail(account.avatar || null)
                .addFields(
                    { name: '🏆 Victorias', value: `${stats.wins || 0}`, inline: true },
                    { name: '🔥 Eliminaciones', value: `${stats.kills || 0}`, inline: true },
                    { name: '📊 Partidas', value: `${stats.matches || 0}`, inline: true },
                    { name: '🎯 K/D Ratio', value: `${stats.kd || 0}`, inline: true },
                    { name: '💀 Muertes', value: `${stats.deaths || 0}`, inline: true },
                    { name: '🏅 Top 10', value: `${stats.top10 || 0}`, inline: true },
                    { name: '🎮 Win Rate', value: `${stats.winRate ? stats.winRate.toFixed(2) + '%' : '0%'}`, inline: true },
                    { name: '🔫 Headshots', value: `${stats.headshots || 0}`, inline: true },
                    { name: '⏱️ Minutos jugados', value: `${stats.minutesPlayed || 0}`, inline: true }
                )
                .setFooter({ text: 'fortnite-api.com • Datos de la temporada actual' })
                .setTimestamp();

            // --- Añadir stats por modo si existen ---
            if (data.stats.solo) {
                embed.addFields(
                    { name: '🥇 Solo - Victorias', value: `${data.stats.solo.wins || 0}`, inline: true },
                    { name: '🥇 Solo - K/D', value: `${data.stats.solo.kd || 0}`, inline: true }
                );
            }
            if (data.stats.duo) {
                embed.addFields(
                    { name: '🥈 Duo - Victorias', value: `${data.stats.duo.wins || 0}`, inline: true },
                    { name: '🥈 Duo - K/D', value: `${data.stats.duo.kd || 0}`, inline: true }
                );
            }
            if (data.stats.squad) {
                embed.addFields(
                    { name: '🥉 Squad - Victorias', value: `${data.stats.squad.wins || 0}`, inline: true },
                    { name: '🥉 Squad - K/D', value: `${data.stats.squad.kd || 0}`, inline: true }
                );
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error en /stats:', error.response?.data || error.message);
            
            if (error.response?.status === 404) {
                await interaction.editReply(`❌ No se encontró al jugador "${username}". Verifica el nombre (mayúsculas/minúsculas importan).`);
            } else if (error.response?.status === 403 || error.response?.status === 401) {
                await interaction.editReply(`❌ Error de autenticación con la API. Verifica tu API Key en las variables de entorno.`);
            } else {
                await interaction.editReply(`❌ Error: ${error.message}`);
            }
        }
    }
});

// --- Manejar selección de torneo (placeholder, la API no da torneos detallados) ---
// Este código mantiene la funcionalidad por si más adelante cambias a otra API

// --- Iniciar sesión ---
client.login(process.env.DISCORD_TOKEN);
