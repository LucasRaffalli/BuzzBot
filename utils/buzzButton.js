const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { syncBuzzState } = require('./eventStorage');

/**
 * Envoie ou met à jour le bouton BUZZ
 * @param {Client} client - Le client Discord
 * @param {string} guildId - L'ID du serveur
 * @param {Object} buzzState - L'état actuel du BUZZ
 * @param {boolean} forceNew - Force la création d'un nouveau message
 * @returns {Promise<Message>} - Le message envoyé ou édité
 */
async function sendBuzzButton(client, guildId, buzzState, forceNew = false) {
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
        // Couleur et état selon canBuzz
        const isLocked = !buzzState.canBuzz && !buzzState.currentSpeaker;
        const buttonStyle = isLocked ? ButtonStyle.Danger : ButtonStyle.Success;
        const buttonLabel = isLocked ? 'BUZZ 🔒' : 'BUZZ';
        const embedColor = isLocked ? '#FF0000' : '#00FF00';
        const statusText = isLocked ? '🔒 **VERROUILLÉ** - Attendez le déverrouillage' : '✅ **DÉVERROUILLÉ** - Vous pouvez buzzer!';
        
        const button = new ButtonBuilder()
            .setCustomId(`buzz_${buzzState.eventId}`)
            .setLabel(buttonLabel)
            .setEmoji('🔔')
            .setStyle(buttonStyle);

        const row = new ActionRowBuilder()
            .addComponents(button);

        const modeText = buzzState.mode === 'multi' 
            ? '🎪 **MultiBuzz** - 3 joueurs + vote'
            : '🎯 **SimpleBuzz** - 1 joueur';

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('🔔 Cliquez pour BUZZ!')
            .setDescription(
                `${modeText}\n\n` +
                `${statusText}\n\n` +
                `_Event ID: \`${buzzState.eventId}\`_`
            )
            .setTimestamp();

        // Essayer d'éditer le message existant
        if (buzzState.buzzMessageId && !forceNew) {
            try {
                const existingMessage = await channel.messages.fetch(buzzState.buzzMessageId);
                await existingMessage.edit({
                    embeds: [embed],
                    components: [row]
                });
                console.log(`🔄 Bouton BUZZ mis à jour (${isLocked ? '🔴 verrouillé' : '🟢 déverrouillé'})`);
                return existingMessage;
            } catch (error) {
                console.log('⚠️ Message BUZZ introuvable, création d\'un nouveau...');
            }
        }

        // Créer un nouveau message
        const newMessage = await channel.send({
            embeds: [embed],
            components: [row]
        });
        
        // Sauvegarder l'ID du message
        buzzState.buzzMessageId = newMessage.id;
        client.buzzState.set(guildId, buzzState);
        syncBuzzState(client, guildId);
        
        console.log(`📤 Nouveau bouton BUZZ envoyé (${isLocked ? '🔴 verrouillé' : '🟢 déverrouillé'})`);
        return newMessage;
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du bouton BUZZ:', error);
    }
}

module.exports = { sendBuzzButton };
