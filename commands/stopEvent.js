const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { deleteEvent } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stopevent')
        .setDescription('Arrête l\'événement et quitte le canal vocal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    
    async execute(interaction) {
        // Vérifier l'état de l'événement
        const buzzState = interaction.client.buzzState.get(interaction.guildId);
        
        if (!buzzState) {
            return interaction.reply({
                content: '❌ Aucun événement n\'est en cours!',
                ephemeral: true
            });
        }
        
        // Vérifier que c'est le créateur ou un admin
        if (buzzState.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut arrêter l\'événement!',
                ephemeral: true
            });
        }
        
        // Vérifier si le bot est connecté à un canal vocal
        const connection = getVoiceConnection(interaction.guildId);
        
        if (!connection) {
            return interaction.reply({
                content: '❌ Je ne suis pas dans un canal vocal, mais je vais nettoyer l\'événement.',
                ephemeral: true
            }).then(() => {
                // Nettoyer quand même l'état
                interaction.client.buzzState.delete(interaction.guildId);
                deleteEvent(interaction.guildId);
            });
        }

        try {
            // Déconnecter le bot
            connection.destroy();
            
            // Nettoyer l'état du BUZZ
            interaction.client.buzzState.delete(interaction.guildId);
            
            // Supprimer du fichier JSON
            deleteEvent(interaction.guildId);
            console.log(`💾 Événement supprimé de events.json`);
            
            console.log(`✅ Bot déconnecté du canal vocal sur ${interaction.guild.name}`);

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🛑 Événement terminé')
                .setDescription('J\'ai quitté le canal vocal.')
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('❌ Erreur lors de la déconnexion:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la déconnexion!',
                ephemeral: true
            });
        }
    },
};
