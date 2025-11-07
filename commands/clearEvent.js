const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { deleteEvent, getAllEvents } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearevent')
        .setDescription('Nettoie tous les événements actifs du bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        try {
            // Récupérer tous les événements actifs
            const allEvents = getAllEvents();
            const eventCount = Object.keys(allEvents).length;
            
            if (eventCount === 0) {
                return interaction.reply({
                    content: '❌ Aucun événement actif à nettoyer!',
                    ephemeral: true
                });
            }
            
            // Déconnecter le bot de tous les canaux vocaux et nettoyer les états
            let disconnectedCount = 0;
            let cleanedCount = 0;
            
            for (const guildId of Object.keys(allEvents)) {
                // Déconnecter le bot du canal vocal si connecté
                const connection = getVoiceConnection(guildId);
                if (connection) {
                    connection.destroy();
                    disconnectedCount++;
                }
                
                // Nettoyer l'état du BUZZ en mémoire
                if (interaction.client.buzzState.has(guildId)) {
                    interaction.client.buzzState.delete(guildId);
                }
                
                // Supprimer du fichier JSON
                deleteEvent(guildId);
                cleanedCount++;
                
                console.log(`🧹 Événement nettoyé pour le serveur ${guildId}`);
            }
            
            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🧹 Nettoyage terminé')
                .setDescription(`✅ ${cleanedCount} événement(s) nettoyé(s)\n✅ ${disconnectedCount} connexion(s) vocale(s) fermée(s)`)
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });
            
            console.log(`✅ Nettoyage global terminé: ${cleanedCount} événements supprimés`);

        } catch (error) {
            console.error('❌ Erreur lors du nettoyage:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du nettoyage!',
                ephemeral: true
            });
        }
    },
};
