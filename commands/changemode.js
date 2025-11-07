const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changemode')
        .setDescription('Change le mode de jeu pendant un événement')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Nouveau mode de jeu')
                .setRequired(true)
                .addChoices(
                    { name: '🎯 SimpleBuzz - 1 personne à la fois', value: 'simple' },
                    { name: '🎪 MultiBuzz - 3 personnes + vote', value: 'multi' }
                )
        ),
    
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
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut changer le mode!',
                ephemeral: true
            });
        }

        const newMode = interaction.options.getString('mode');
        const oldMode = buzzState.mode;

        // Si le mode est déjà le même
        if (oldMode === newMode) {
            return interaction.reply({
                content: `⚠️ Vous êtes déjà en mode **${newMode === 'simple' ? 'SimpleBuzz' : 'MultiBuzz'}**!`,
                ephemeral: true
            });
        }

        // Changer le mode
        buzzState.mode = newMode;
        
        // Réinitialiser l'état en fonction du nouveau mode
        buzzState.canBuzz = true;
        buzzState.currentSpeaker = null;
        buzzState.multiBuzzers = [];
        buzzState.voteData = null;

        // Remuter tout le monde pour recommencer proprement
        try {
            const voiceChannel = interaction.guild.channels.cache.get(buzzState.voiceChannelId);
            if (voiceChannel) {
                const members = voiceChannel.members.filter(member => !member.user.bot);
                let mutedCount = 0;
                
                for (const [, member] of members) {
                    // Ne pas muter le créateur
                    if (member.id === buzzState.createdBy) {
                        console.log(`⏭️ Créateur ${member.user.tag} non muté`);
                        continue;
                    }
                    
                    try {
                        if (!member.voice.mute) {
                            await member.voice.setMute(true, 'Changement de mode');
                            mutedCount++;
                        }
                    } catch (error) {
                        console.error(`Erreur lors du mute de ${member.user.tag}:`, error.message);
                    }
                }

                console.log(`🔄 Mode changé de ${oldMode} à ${newMode} - ${mutedCount} membre(s) remuté(s)`);
            }
        } catch (error) {
            console.error('Erreur lors du remute après changement de mode:', error);
        }

        const modeText = newMode === 'multi' 
            ? '🎪 **MultiBuzz** - Les 3 premiers à buzzer parlent, puis vote!'
            : '🎯 **SimpleBuzz** - Le premier à buzzer parle';

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔄 Mode de jeu changé!')
            .setDescription(
                `**Ancien mode:** ${oldMode === 'simple' ? '🎯 SimpleBuzz' : '🎪 MultiBuzz'}\n` +
                `**Nouveau mode:** ${modeText}\n\n` +
                `✅ Tous les participants ont été remutés\n` +
                `✅ Le bouton BUZZ est réactivé\n` +
                `✅ L'état du jeu a été réinitialisé\n\n` +
                `Les participants peuvent maintenant cliquer sur 🔔 **BUZZ** pour jouer!`
            )
            .setTimestamp()
            .setFooter({ text: `Changé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    },
};
