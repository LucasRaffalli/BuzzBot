const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendBuzzButton } = require('../utils/buzzButton');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlockbuzz')
        .setDescription('Déverrouille le BUZZ - les participants peuvent à nouveau buzzer')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    
    async execute(interaction) {
        const buzzState = interaction.client.buzzState.get(interaction.guildId);
        
        if (!buzzState) {
            return interaction.reply({
                content: '❌ Aucun événement en cours! Utilisez `/startevent` pour démarrer un événement.',
                ephemeral: true
            });
        }
        
        // Vérifier que c'est le créateur ou un admin
        if (buzzState.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut utiliser cette commande!',
                ephemeral: true
            });
        }

        // Vérifier si déjà déverrouillé
        if (buzzState.canBuzz) {
            return interaction.reply({
                content: '⚠️ Le BUZZ est déjà déverrouillé!',
                ephemeral: true
            });
        }

        try {
            // Déverrouiller le BUZZ
            buzzState.canBuzz = true;
            buzzState.currentSpeaker = null;
            buzzState.attackData = null;
            buzzState.multiBuzzers = [];
            buzzState.voteData = null;
            
            // Sauvegarder
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);

            // Mettre à jour le bouton BUZZ (vert)
            await sendBuzzButton(interaction.client, interaction.guildId, buzzState);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 BUZZ Déverrouillé!')
                .setDescription(
                    `Le système BUZZ a été déverrouillé par ${interaction.user}.\n\n` +
                    `Les participants peuvent maintenant cliquer sur le bouton BUZZ!`
                )
                .setTimestamp()
                .setFooter({ text: `Déverrouillé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });

            console.log(`🔓 [Event ${buzzState.eventId}] BUZZ déverrouillé par ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Erreur lors du déverrouillage du BUZZ:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du déverrouillage!',
                ephemeral: true
            });
        }
    },
};
