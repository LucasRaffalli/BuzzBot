const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockbuzz')
        .setDescription('Verrouille le BUZZ - plus personne ne peut buzzer')
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

        // Vérifier si déjà verrouillé
        if (!buzzState.canBuzz) {
            return interaction.reply({
                content: '⚠️ Le BUZZ est déjà verrouillé!',
                ephemeral: true
            });
        }

        try {
            // Verrouiller le BUZZ
            buzzState.canBuzz = false;
            buzzState.currentSpeaker = null; // Personne ne peut buzzer
            
            // Sauvegarder
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔒 BUZZ Verrouillé!')
                .setDescription(
                    `Le système BUZZ a été verrouillé par ${interaction.user}.\n\n` +
                    `Plus personne ne peut cliquer sur le bouton BUZZ.\n\n` +
                    `Utilisez \`/unlockbuzz\` pour le déverrouiller.`
                )
                .setTimestamp()
                .setFooter({ text: `Verrouillé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });

            console.log(`🔒 [Event ${buzzState.eventId}] BUZZ verrouillé par ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Erreur lors du verrouillage du BUZZ:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du verrouillage!',
                ephemeral: true
            });
        }
    },
};
