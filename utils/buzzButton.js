const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Envoie le bouton BUZZ en bas du canal
 * @param {Client} client - Le client Discord
 * @param {string} guildId - L'ID du serveur
 * @param {Object} buzzState - L'état actuel du BUZZ
 * @returns {Promise<Message>} - Le message envoyé
 */
async function sendBuzzButton(client, guildId, buzzState) {
    if (!buzzState || !buzzState.channelId) {
        console.error('❌ Impossible d\'envoyer le bouton BUZZ: channelId manquant');
        return;
    }

    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(buzzState.channelId);

        if (!channel) {
            console.error('❌ Canal introuvable:', buzzState.channelId);
            return;
        }

        // Inclure l'eventId dans le customId du bouton
        const button = new ButtonBuilder()
            .setCustomId(`buzz_${buzzState.eventId}`)
            .setLabel('BUZZ')
            .setEmoji('🔔')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder()
            .addComponents(button);

        const modeText = buzzState.mode === 'multi' 
            ? '🎪 **MultiBuzz** - 3 joueurs + vote'
            : '🎯 **SimpleBuzz** - 1 joueur';

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔔 Cliquez pour BUZZ!')
            .setDescription(
                `${modeText}\n\n` +
                `Cliquez sur le bouton pour participer!\n` +
                `_Event ID: \`${buzzState.eventId}\`_`
            )
            .setTimestamp();

        return await channel.send({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du bouton BUZZ:', error);
    }
}

module.exports = { sendBuzzButton };
