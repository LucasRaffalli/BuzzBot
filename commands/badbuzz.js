const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendBuzzButton } = require('../utils/buzzButton');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badbuzz')
        .setDescription('❌ Réponse incorrecte - Ne donne pas de point et réactive le BUZZ')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    
    async execute(interaction) {
        // Récupérer l'état du BUZZ
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
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut refuser les réponses!',
                ephemeral: true
            });
        }
        
        console.log(`[Event ${buzzState.eventId}] Validation badbuzz par ${interaction.user.tag}`);

        // MODE MULTI BUZZ
        if (buzzState.mode === 'multi' && buzzState.multiBuzzers && buzzState.multiBuzzers.length > 0) {
            try {
                // Remute tous les participants du MultiBuzz
                for (const buzzer of buzzState.multiBuzzers) {
                    const member = await interaction.guild.members.fetch(buzzer.userId);
                    await member.voice.setMute(true, 'Mauvaise réponse MultiBuzz');
                }
                
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ MultiBuzz - Réponse incorrecte')
                    .setDescription(
                        `**Les 3 participants ont été remutés:**\n\n` +
                        buzzState.multiBuzzers.map((b, i) => `${i + 1}. <@${b.userId}>`).join('\n') +
                        `\n\n🔴 **Aucun point n'a été perdu**\n` +
                        `Cliquez sur 🔔 **BUZZ** pour une nouvelle tentative!`
                    )
                    .setTimestamp()
                    .setFooter({ text: `Refusé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                
                await interaction.reply({ embeds: [embed] });
                
                // Réinitialiser le MultiBuzz
                buzzState.multiBuzzers = [];
                buzzState.voteData = null;
                buzzState.canBuzz = true;
                
                // Sauvegarder les modifications
                interaction.client.buzzState.set(interaction.guildId, buzzState);
                syncBuzzState(interaction.client, interaction.guildId);
                
                // Renvoyer le bouton BUZZ
                await sendBuzzButton(interaction.client, interaction.guildId, buzzState);
                
                console.log(`❌ MultiBuzz refusé - Les 3 participants remutés, aucun point perdu`);
                return;
                
            } catch (error) {
                console.error('Erreur MultiBuzz badbuzz:', error);
                return interaction.reply({
                    content: '❌ Erreur lors du remute des participants MultiBuzz!',
                    ephemeral: true
                });
            }
        }

        // MODE SIMPLE BUZZ
        if (!buzzState.currentSpeaker) {
            return interaction.reply({
                content: '❌ Personne n\'a buzzé actuellement!',
                ephemeral: true
            });
        }
        
        try {
            // Récupérer le membre qui a buzzé
            const member = await interaction.guild.members.fetch(buzzState.currentSpeaker);
            
            // Remuter le joueur qui a donné la mauvaise réponse
            if (member.voice.channel) {
                await member.voice.setMute(true, 'Mauvaise réponse - BADBUZZ');
            }
            
            // Réinitialiser le BUZZ pour permettre à quelqu'un d'autre de buzzer
            buzzState.canBuzz = true;
            buzzState.currentSpeaker = null;
            
            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);
            
            // Créer l'embed
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Mauvaise réponse!')
                .setDescription(
                    `**${member.user}** n'a pas donné la bonne réponse.\n\n` +
                    `❌ **Aucun point attribué**\n` +
                    `🔄 Le BUZZ est réactivé - Quelqu'un d'autre peut essayer!`
                )
                .setTimestamp()
                .setFooter({ text: `Refusé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [embed] });
            
            // Renvoyer le bouton BUZZ
            await sendBuzzButton(interaction.client, interaction.guildId, buzzState);
            
            console.log(`❌ ${member.user.tag} a donné une mauvaise réponse - BUZZ réactivé`);
            
        } catch (error) {
            console.error('❌ Erreur lors du refus:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du refus!',
                ephemeral: true
            });
        }
    },
};
