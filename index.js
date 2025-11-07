const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Créer le client Discord avec les intents nécessaires
// Note: MessageContent et GuildMembers sont des Privileged Intents
// Ils doivent être activés dans le Discord Developer Portal
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Nécessaire pour gérer les rôles
        GatewayIntentBits.GuildVoiceStates, // Nécessaire pour les canaux vocaux
        // Décommentez ces lignes si besoin:
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Collection pour stocker les commandes
client.commands = new Collection();

// Map pour stocker l'état des BUZZ par serveur (guildId => { canBuzz: true/false, currentSpeaker: userId/null })
client.buzzState = new Map();

// Charger les handlers
const loadHandlers = () => {
    const handlers = ['commandHandler', 'eventHandler'];
    
    handlers.forEach(handler => {
        try {
            require(`./utils/${handler}`)(client);
            console.log(`✅ ${handler} chargé avec succès`);
        } catch (error) {
            console.error(`❌ Erreur lors du chargement de ${handler}:`, error);
        }
    });
};

// Initialiser le bot
const init = async () => {
    try {
        // Charger les handlers
        loadHandlers();
        
        // Connexion au bot
        await client.login(process.env.DISCORD_TOKEN);
        
        // Restaurer les événements sauvegardés après la connexion
        client.once('ready', () => {
            const { restoreEventsToMemory } = require('./utils/eventStorage');
            restoreEventsToMemory(client);
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du bot:', error);
        process.exit(1);
    }
};

// Gestion des erreurs
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Exception non capturée:', error);
});

// Démarrer le bot
init();
