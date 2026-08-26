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
            // PASO 1: Buscar el Account ID por nombre de usuario (Endpoint GRATUITO)
            const accountRes = await axios.get(`${API_BASE}/account/displayName/${encodeURIComponent(username)}`, {
                headers: { 'x-api-key': process.env.FORTNITE_API_KEY }
            });

            const accountId = accountRes.data.data?.id;
            if (!accountId) return interaction.editReply('❌ Jugador no encontrado.');

            // PASO 2: Obtener historial de torneos (Endpoint GRATUITO - v2)
            const historyRes = await axios.get(`${API_BASE}/../api/v2/events/players/${accountId}/history`, {
                headers: { 'x-api-key': process.env.FORTNITE_API_KEY }
            });

            const tournaments = historyRes.data.data || [];
            if (tournaments.length === 0) {
                return interaction.editReply(`❌ ${username} no tiene torneos recientes.`);
            }

            // Crear menu desplegable con los torneos
            const select = new StringSelectMenuBuilder()
                .setCustomId('select_tournament')
                .setPlaceholder('Selecciona un torneo...')
                .addOptions(tournaments.slice(0, 10).map(t => ({
                    label: t.eventName || t.tournamentName || 'Torneo',
                    description: t.eventId || 'ID: ' + t.id,
                    value: t.eventId || t.id
                })));

            await interaction.editReply({
                content: `🎮 **${tournaments.length} torneos encontrados para ${username}**:`,
                components: [new ActionRowBuilder().addComponents(select)]
            });

        } catch (error) {
            console.error(error);
            if (error.response?.status === 403) {
                await interaction.editReply('❌ Error 403: Este endpoint requiere plan Pro. Usando endpoints gratuitos...');
            } else {
                await interaction.editReply(`❌ Error: ${error.message}`);
            }
        }
    }

    // Manejar la selección del dropdown
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_tournament') {
        await interaction.deferUpdate();
        const eventId = interaction.values[0];

        // Mostrar stats de ejemplo (el plan free no da stats detalladas por torneo)
        const embed = new EmbedBuilder()
            .setTitle('🏆 Estadísticas del Torneo')
            .setDescription('📌 **Nota:** Las estadísticas detalladas (eliminaciones, daño, construcciones) requieren el plan Pro.\n\n' +
                           'Actualmente estás en el plan **Free**.\n' +
                           'Puedes ver estadísticas básicas en: https://fortnitetracker.com')
            .setColor(0xFFA500)
            .addFields(
                { name: '📋 Evento ID', value: eventId || 'No disponible', inline: false },
                { name: '💡 ¿Quieres más detalles?', value: 'Actualiza a Pro en api-fortnite.com/pricing', inline: false }
            );

        await interaction.editReply({
            content: `📊 Has seleccionado el torneo: **${eventId}**`,
            embeds: [embed],
            components: []
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
