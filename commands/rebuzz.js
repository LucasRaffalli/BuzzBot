const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { sendBuzzButton } = require('../utils/buzzButton');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rebuzz')
        .setDescription('Remute tous les participants de l\'événement')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    
    async execute(interaction) {
        // Récupérer l'état pour vérifier le créateur
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
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut utiliser cette commande!',
                ephemeral: true
            });
        }

        // Vérifier si le bot est dans un canal vocal
        const connection = getVoiceConnection(interaction.guildId);
        
        if (!connection) {
            return interaction.reply({
                content: '❌ Le bot n\'est pas connecté au canal vocal!',
                ephemeral: true
            });
        }

        // Vérifier si l'utilisateur est dans un canal vocal
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ Vous devez être dans le canal vocal pour utiliser cette commande!',
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;

        // Vérifier les permissions
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionFlagsBits.MuteMembers)) {
            return interaction.reply({
                content: '❌ Je n\'ai pas la permission de muter les membres!',
                ephemeral: true
            });
        }

        try {
            // Muter tous les membres (sauf les bots et le créateur)
            const members = voiceChannel.members.filter(member => !member.user.bot);
            let mutedCount = 0;

            for (const [, member] of members) {
                // Ne pas muter le créateur de l'événement
                if (member.id === buzzState.createdBy) {
                    console.log(`⏭️ Créateur ${member.user.tag} non muté`);
                    continue;
                }
                
                try {
                    if (!member.voice.serverMute) {
                        await member.voice.setMute(true, `REBUZZ par ${interaction.user.tag}`);
                        mutedCount++;
                    }
                } catch (error) {
                    console.error(`Erreur lors du mute de ${member.user.tag}:`, error.message);
                }
            }

            console.log(`✅ REBUZZ: ${mutedCount} membre(s) remuté(s) par ${interaction.user.tag}`);

            // Réinitialiser l'état du BUZZ pour permettre un nouveau BUZZ
            buzzState.canBuzz = true;
            buzzState.currentSpeaker = null;
            buzzState.attackData = null;
            buzzState.multiBuzzers = [];
            buzzState.voteData = null;
            
            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('🔄 REBUZZ!')
                .setDescription(
                    `Tous les participants ont été remutés!\n\n` +
                    `**${mutedCount}** personne(s) muté(es)\n\n` +
                    `Les participants peuvent cliquer à nouveau sur **BUZZ** pour parler.`
                )
                .setTimestamp()
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({
                embeds: [embed]
            });

            // Mettre à jour le bouton BUZZ (vert déverrouillé)
            await sendBuzzButton(interaction.client, interaction.guildId, buzzState);

        } catch (error) {
            console.error('❌ Erreur lors du REBUZZ:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du remute!',
                ephemeral: true
            });
        }
    },
};
