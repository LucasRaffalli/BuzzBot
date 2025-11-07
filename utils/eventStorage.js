const fs = require('fs');
const path = require('path');

const EVENTS_FILE = path.join(__dirname, '../data/events.json');
let persistenceEnabled = true;

// Créer le dossier data s'il n'existe pas
const ensureDataDir = () => {
    const dataDir = path.join(__dirname, '../data');
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
        }
        // Tester les permissions d'écriture
        const testFile = path.join(dataDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
    } catch (error) {
        console.error('⚠️ Impossible de créer/écrire dans le dossier data:', error.message);
        console.error('⚠️ Persistance désactivée - les événements seront perdus au redémarrage!');
        persistenceEnabled = false;
        return false;
    }
};

// Charger les événements depuis le fichier
const loadEvents = () => {
    if (!persistenceEnabled || !ensureDataDir()) {
        return {};
    }
    
    try {
        if (fs.existsSync(EVENTS_FILE)) {
            const data = fs.readFileSync(EVENTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des événements:', error.message);
    }
    
    // Structure: { guildId: { eventId, canBuzz, currentSpeaker, ... } }
    return {};
};

// Sauvegarder les événements dans le fichier
const saveEvents = (events) => {
    if (!persistenceEnabled || !ensureDataDir()) {
        return false;
    }
    
    try {
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des événements:', error.message);
        console.error('⚠️ Vérifiez les permissions du dossier data/');
        return false;
    }
};

// Sauvegarder un événement pour un serveur
const saveEvent = (guildId, eventData) => {
    const events = loadEvents();
    events[guildId] = eventData;
    return saveEvents(events);
};

// Récupérer l'événement d'un serveur
const getEvent = (guildId) => {
    const events = loadEvents();
    return events[guildId] || null;
};

// Supprimer l'événement d'un serveur
const deleteEvent = (guildId) => {
    const events = loadEvents();
    if (events[guildId]) {
        delete events[guildId];
        saveEvents(events);
        return true;
    }
    return false;
};

// Récupérer tous les événements actifs
const getAllEvents = () => {
    return loadEvents();
};

// Restaurer les événements dans le buzzState du client
const restoreEventsToMemory = (client) => {
    const events = loadEvents();
    let count = 0;
    
    for (const [guildId, eventData] of Object.entries(events)) {
        // Vérifier que l'événement n'est pas trop vieux (max 24h)
        const eventAge = Date.now() - eventData.createdAt;
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 heures
        
        if (eventAge < MAX_AGE) {
            client.buzzState.set(guildId, eventData);
            count++;
            console.log(`✅ Événement restauré pour le serveur ${guildId} (${eventData.eventId})`);
        } else {
            // Supprimer les événements trop anciens
            deleteEvent(guildId);
            console.log(`🗑️ Événement expiré supprimé pour le serveur ${guildId}`);
        }
    }
    
    console.log(`📊 ${count} événement(s) restauré(s) depuis le fichier`);
    return count;
};

// Sauvegarder automatiquement le buzzState d'un serveur
const syncBuzzState = (client, guildId) => {
    const buzzState = client.buzzState.get(guildId);
    if (buzzState) {
        saveEvent(guildId, buzzState);
    }
};

module.exports = {
    loadEvents,
    saveEvents,
    saveEvent,
    getEvent,
    deleteEvent,
    getAllEvents,
    restoreEventsToMemory,
    syncBuzzState
};
